"""Generic, deterministic Rule Graph engine.

This module intentionally contains no LLM calls. It reads the seeded
departure_rule_graph.json, evaluates GREEN/AMBER/RED/N-A signals from
simple threshold conditions, and topologically sorts task nodes using
REQUIRED_BEFORE / RECOMMENDED_BEFORE edges. All numbers that matter
(deadlines, document lists) come straight from the JSON, not from a model.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from app.config import DATA_DIR
from app.models.schemas import AlternativeChannel, SignalStatus, SourceRef, TaskSignal, WorkflowStep
from app.services import source_service


@dataclass
class RuleContext:
    nationality: str
    visa_type: str
    days_to_departure: int | None = None
    tenure_months: int | None = None
    documents_held: set[str] = field(default_factory=set)
    has_arc: bool | None = None
    is_tax_resident: bool | None = None
    visa_remaining_months: int | None = None

    def get(self, field_name: str) -> Any:
        return getattr(self, field_name, None)


@lru_cache
def _load_graph() -> dict:
    path = DATA_DIR / "rules" / "departure_rule_graph.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


_OPS = {
    "lte": lambda a, b: a is not None and a <= b,
    "lt": lambda a, b: a is not None and a < b,
    "gte": lambda a, b: a is not None and a >= b,
    "gt": lambda a, b: a is not None and a > b,
    "eq": lambda a, b: a == b,
    "ne": lambda a, b: a != b,
}


def _condition_met(condition: dict, ctx: RuleContext) -> bool:
    value = ctx.get(condition["field"])
    op = _OPS[condition["op"]]
    return op(value, condition["value"])


def _evaluate_signal(node: dict, ctx: RuleContext) -> tuple[SignalStatus, str]:
    signal_rule = node.get("signal_rule", {})
    for threshold in signal_rule.get("thresholds", []):
        if _condition_met(threshold["condition"], ctx):
            return SignalStatus(threshold["signal"]), threshold["reason_ko"]
    default = signal_rule.get("default", {"signal": "AMBER", "reason_ko": "확인이 필요합니다."})
    return SignalStatus(default["signal"]), default["reason_ko"]


def evaluate_tasks(ctx: RuleContext) -> list[TaskSignal]:
    graph = _load_graph()
    results: list[TaskSignal] = []
    for node in graph["nodes"]:
        signal, reason = _evaluate_signal(node, ctx)
        alt = node.get("alternative_channel")
        results.append(
            TaskSignal(
                task_id=node["id"],
                label=node["label_ko"],
                signal=signal,
                reason=reason,
                required_documents=node.get("required_documents", []),
                channel=node.get("channel"),
                responsible_org=node.get("responsible_org"),
                actor=node.get("actor", "WORKER"),
                sources=source_service.get_sources(node.get("source_refs", [])),
                alternative_channel=AlternativeChannel(**alt) if alt else None,
            )
        )
    return results


def get_node(task_id: str) -> dict | None:
    graph = _load_graph()
    return next((n for n in graph["nodes"] if n["id"] == task_id), None)


def get_all_nodes() -> list[dict]:
    return _load_graph()["nodes"]


def build_workflow() -> list[WorkflowStep]:
    """Kahn's algorithm topological sort over REQUIRED_BEFORE / RECOMMENDED_BEFORE edges.

    REQUIRED_BEFORE edges are treated as hard ordering constraints. RECOMMENDED_BEFORE
    edges are used to break ties when possible but never block ordering the way
    REQUIRED_BEFORE does.
    """
    graph = _load_graph()
    nodes = {n["id"]: n for n in graph["nodes"]}
    required_edges = [e for e in graph["edges"] if e["edge_type"] == "REQUIRED_BEFORE"]
    recommended_edges = [e for e in graph["edges"] if e["edge_type"] == "RECOMMENDED_BEFORE"]

    indegree = {nid: 0 for nid in nodes}
    adj: dict[str, list[str]] = {nid: [] for nid in nodes}
    for e in required_edges:
        adj[e["from_node"]].append(e["to_node"])
        indegree[e["to_node"]] += 1

    ordered: list[str] = []
    available = [nid for nid, deg in indegree.items() if deg == 0]
    available.sort(key=lambda nid: list(nodes.keys()).index(nid))

    while available:
        current = available.pop(0)
        ordered.append(current)
        for nxt in adj[current]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                available.append(nxt)
        available.sort(key=lambda nid: list(nodes.keys()).index(nid))

    priority_by_task: dict[str, str] = {}
    edge_type_by_task: dict[str, str] = {}
    for e in required_edges:
        priority_by_task[e["to_node"]] = "REQUIRED"
        edge_type_by_task[e["to_node"]] = "REQUIRED_BEFORE"
    for e in recommended_edges:
        priority_by_task.setdefault(e["to_node"], "RECOMMENDED")
        edge_type_by_task.setdefault(e["to_node"], "RECOMMENDED_BEFORE")

    steps: list[WorkflowStep] = []
    for i, task_id in enumerate(ordered, start=1):
        node = nodes[task_id]
        priority = priority_by_task.get(task_id, "INFO" if node.get("category") == "INFO" else "RECOMMENDED")
        steps.append(
            WorkflowStep(
                step=i,
                task_id=task_id,
                label=node["label_ko"],
                priority=priority,  # type: ignore[arg-type]
                edge_type=edge_type_by_task.get(task_id),
                note=node.get("note"),
            )
        )
    return steps
