"""Shared test fixtures."""

from pathlib import Path

import pytest


@pytest.fixture
def fixtures_dir() -> Path:
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def bus_image_path(fixtures_dir: Path) -> Path:
    path = fixtures_dir / "bus.jpg"
    if not path.exists():
        pytest.skip("bus.jpg fixture not found")
    return path
