"""Regression for sensors with incomplete sampling metadata."""

import asyncio
import re
import sqlite3
from unittest.mock import AsyncMock

from openaq_api.v3.routers.sensors import LocationSensorQuery, fetch_sensors


def test_sensor_coverage_requires_sampling_intervals():
    db = AsyncMock()
    asyncio.run(fetch_sensors(LocationSensorQuery(locations_id=1), db))
    sql = db.fetchPage.await_args.args[0]
    coverage = sql.split("END as summary", 1)[1].split("END as coverage", 1)[0]
    condition = re.search(r"WHEN\s+(.*?)\s+THEN", coverage, re.DOTALL).group(1)

    statement = (
        f"SELECT CASE WHEN {condition} THEN 1 ELSE 0 END "
        "FROM (SELECT ? value_latest, ? value_count) r "
        "CROSS JOIN (SELECT ? data_averaging_period_seconds, "
        "? data_logging_period_seconds) s"
    )
    cases = (
        ((3.2, 12, 60, 60), 1),
        ((3.2, 12, None, 60), 0),
        ((3.2, 12, 60, None), 0),
        ((3.2, 12, 0, 60), 0),
        ((3.2, None, 60, 60), 0),
    )
    with sqlite3.connect(":memory:") as connection:
        for values, expected in cases:
            assert connection.execute(statement, values).fetchone()[0] == expected
