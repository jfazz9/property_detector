import sqlite3

import pandas as pd
import pytest

from scripts.webapp_backend.data_loader import (
    load_market_rentals,
    load_market_sales,
    read_master,
)


def create_test_database(path):
    with sqlite3.connect(path) as connection:
        pd.DataFrame([
            {
                "url": "https://example.com/sale",
                "listing_purpose": "sale",
                "is_active": 1,
            }
        ]).to_sql("sale_listings", connection, index=False)
        pd.DataFrame([
            {
                "url": "https://example.com/rent",
                "listing_purpose": "rent",
                "is_active": 0,
            }
        ]).to_sql("rental_listings", connection, index=False)
        pd.DataFrame([
            {
                "price": "5500000",
                "price_per_sqft": "1800",
                "size_sqft": "3050",
                "beds": "3",
                "sold_date": "10/06/2026",
            }
        ]).to_sql("market_sales", connection, index=False)
        pd.DataFrame([
            {
                "Bedrooms": "4",
                "Size sqft": "3200",
                "Rental AED": "350000",
                "Start Date": "09/06/2026",
            }
        ]).to_sql("market_rentals", connection, index=False)


def test_read_master_uses_sqlite_table_for_purpose(tmp_path, monkeypatch):
    database = tmp_path / "property_detector.db"
    create_test_database(database)
    monkeypatch.setenv("PROPERTY_DATABASE_PATH", str(database))

    sale_df, sale_source = read_master("sale")
    rent_df, rent_source = read_master("rent")

    assert sale_df["url"].tolist() == ["https://example.com/sale"]
    assert rent_df["url"].tolist() == ["https://example.com/rent"]
    assert sale_source.endswith("property_detector.db#sale_listings")
    assert rent_source.endswith("property_detector.db#rental_listings")


def test_market_loaders_use_sqlite_and_normalize_types(tmp_path, monkeypatch):
    database = tmp_path / "property_detector.db"
    create_test_database(database)
    monkeypatch.setenv("PROPERTY_DATABASE_PATH", str(database))

    sales_df = load_market_sales()
    rentals_df = load_market_rentals()

    assert sales_df.loc[0, "price"] == 5_500_000
    assert sales_df.loc[0, "beds"] == 3
    assert sales_df.loc[0, "_sold_date"] == pd.Timestamp("2026-06-10")
    assert rentals_df.loc[0, "Rental AED"] == 350_000
    assert rentals_df.loc[0, "_start_date"] == pd.Timestamp("2026-06-09")


def test_read_master_explains_how_to_create_missing_database(tmp_path, monkeypatch):
    missing_database = tmp_path / "missing.db"
    monkeypatch.setenv("PROPERTY_DATABASE_PATH", str(missing_database))

    with pytest.raises(FileNotFoundError, match="build_property_database.py"):
        read_master("sale")
