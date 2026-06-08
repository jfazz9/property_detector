from types import SimpleNamespace

from get_sales import selected_steps


def workflow_args(**overrides):
    defaults = {
        "quick_new": False,
        "skip_collect": False,
        "skip_scrape": False,
        "skip_process": False,
        "skip_predict": False,
        "skip_active_check": False,
        "run_active_check": False,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def test_selected_steps_skips_active_check_by_default():
    assert selected_steps(workflow_args()) == ["collect", "scrape", "process", "predict"]


def test_selected_steps_includes_active_check_when_explicitly_requested():
    assert selected_steps(workflow_args(run_active_check=True)) == ["collect", "scrape", "process", "predict", "active"]


def test_selected_steps_skips_active_check_for_quick_new_refresh():
    assert selected_steps(workflow_args(quick_new=True, run_active_check=True)) == ["collect", "scrape", "process", "predict"]
