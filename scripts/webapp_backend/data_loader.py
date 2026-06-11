import os
import sqlite3
from pathlib import Path

import pandas as pd

from enquiry_matcher import clean_number
from workflow_paths import normalize_purpose

from .constants import MARKET_RENTALS_FILE, MARKET_SALES_FILE


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = PROJECT_ROOT / "data" / "property_detector.db"
LISTING_TABLES = {
    "sale": "sale_listings",
    "rent": "rental_listings",
}


def database_path():
    configured_path = os.getenv("PROPERTY_DATABASE_PATH")
    return Path(configured_path).expanduser() if configured_path else DEFAULT_DATABASE_PATH


def read_database_table(table_name):
    path = database_path()

    if not path.exists():
        raise FileNotFoundError(
            f"Missing property database: {path}. "
            "Run scripts/build_property_database.py first."
        )

    connection_uri = f"{path.resolve().as_uri()}?mode=ro"

    try:
        with sqlite3.connect(connection_uri, uri=True) as connection:
            return pd.read_sql_query(f'SELECT * FROM "{table_name}"', connection)
    except (sqlite3.DatabaseError, pd.errors.DatabaseError) as exc:
        raise RuntimeError(
            f"Could not read table '{table_name}' from property database: {path}"
        ) from exc


def read_master(purpose):
    normalized_purpose = normalize_purpose(purpose)
    table_name = LISTING_TABLES[normalized_purpose]
    path = database_path()
    return read_database_table(table_name), f"{path}#{table_name}"


def clean_market_number(value):
    number = clean_number(value)
    return number if number is not None else None


def load_market_sales(path=MARKET_SALES_FILE):
    if str(path) == MARKET_SALES_FILE:
        df = read_database_table("market_sales")
    else:
        market_path = Path(path)

        if not market_path.exists():
            return pd.DataFrame()

        df = pd.read_csv(market_path)

    for column in ["price", "price_per_sqft", "size_sqft", "beds", "prediction_confidence"]:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    if "sold_date" in df.columns:
        df["_sold_date"] = pd.to_datetime(df["sold_date"], errors="coerce", dayfirst=True)

    return df


def load_market_rentals(path=MARKET_RENTALS_FILE):
    if str(path) == MARKET_RENTALS_FILE:
        df = read_database_table("market_rentals")
    else:
        market_path = Path(path)

        if not market_path.exists():
            return pd.DataFrame()

        df = pd.read_csv(market_path)

    numeric_columns = [
        "Bedrooms",
        "Size sqft",
        "Rental AED",
        "Rental Yield %",
        "Purchase Price AED",
    ]

    for column in numeric_columns:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    if "Start Date" in df.columns:
        df["_start_date"] = pd.to_datetime(df["Start Date"], errors="coerce", dayfirst=True)

    return df
