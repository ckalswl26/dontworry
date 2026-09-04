from datetime import date, timedelta

from app.services.calculator import calculate_dday


def test_branch_visit_tasks_get_early_notice_at_d14():
    result = calculate_dday(date.today() + timedelta(days=40))
    early_items = [i for i in result.items if i.day_offset == -14]
    early_task_ids = {i.task_id for i in early_items}

    assert "departure_confirmation" in early_task_ids
    assert "return_cost_insurance" in early_task_ids
    assert "account_closure" in early_task_ids
    assert "pension_refund" in early_task_ids
    assert all(i.requires_visit for i in early_items)
    assert all(i.is_recommended_not_legal for i in early_items)


def test_mobile_channel_task_is_not_flagged_as_requiring_a_visit():
    result = calculate_dday(date.today() + timedelta(days=40))
    remittance_item = next(i for i in result.items if i.task_id == "overseas_remittance")
    assert remittance_item.requires_visit is False


def test_already_covered_task_is_not_duplicated_at_d14():
    result = calculate_dday(date.today() + timedelta(days=40))
    maturity_items = [i for i in result.items if i.task_id == "maturity_insurance"]
    assert len(maturity_items) == 1
    assert maturity_items[0].day_offset == -30
    assert maturity_items[0].requires_visit is True


def test_items_are_sorted_by_day_offset_ascending():
    result = calculate_dday(date.today() + timedelta(days=40))
    offsets = [i.day_offset for i in result.items]
    assert offsets == sorted(offsets)
