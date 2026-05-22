"""Tests for spatial zone mapping."""

from backend.app.spatial import compute_area_frac, compute_zone_depth, compute_zone_x


class TestComputeZoneX:
    def test_left_zone(self):
        # bbox center at x=100 in a 640-wide frame -> 0.156 (left of 0.33)
        box = [50.0, 0.0, 150.0, 100.0]
        assert compute_zone_x(box, 640) == "left"

    def test_center_zone(self):
        # bbox center at x=320 in a 640-wide frame -> 0.5
        box = [270.0, 0.0, 370.0, 100.0]
        assert compute_zone_x(box, 640) == "center"

    def test_right_zone(self):
        # bbox center at x=550 in a 640-wide frame -> 0.859
        box = [500.0, 0.0, 600.0, 100.0]
        assert compute_zone_x(box, 640) == "right"

    def test_hysteresis_keeps_left(self):
        # cx = 0.35 is past cutoff (0.33) but within hysteresis band (0.33+0.05=0.38)
        box = [194.0, 0.0, 254.0, 100.0]  # center at 224/640 = 0.35
        assert compute_zone_x(box, 640, prev_zone="left") == "left"

    def test_hysteresis_switches_to_center(self):
        # cx = 0.42 is past hysteresis band (0.33+0.05=0.38)
        box = [238.0, 0.0, 300.0, 100.0]  # center at 269/640 = 0.42
        assert compute_zone_x(box, 640, prev_zone="left") == "center"


class TestComputeZoneDepth:
    def test_near(self):
        # Large box: 200x200 in 640x480 = 40000/307200 = 0.13 > 0.08
        box = [100.0, 100.0, 300.0, 300.0]
        assert compute_zone_depth(box, 640 * 480) == "near"

    def test_mid(self):
        # Medium box: 100x100 in 640x480 = 10000/307200 = 0.033 > 0.03
        box = [100.0, 100.0, 200.0, 200.0]
        assert compute_zone_depth(box, 640 * 480) == "mid"

    def test_far(self):
        # Small box: 50x50 in 640x480 = 2500/307200 = 0.008 < 0.03
        box = [100.0, 100.0, 150.0, 150.0]
        assert compute_zone_depth(box, 640 * 480) == "far"


class TestComputeAreaFrac:
    def test_basic(self):
        box = [0.0, 0.0, 100.0, 100.0]
        frac = compute_area_frac(box, 640 * 480)
        assert abs(frac - 10000 / 307200) < 0.001

    def test_zero_frame(self):
        box = [0.0, 0.0, 100.0, 100.0]
        assert compute_area_frac(box, 0) == 0.0
