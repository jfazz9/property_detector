import sqlite3
from pathlib import Path

import pandas as pd


DATABASE = Path("data/property_detector.db")

SOURCES = {
    "sale_listings": Path("output/sale/listing_details_master.csv"),
    "rental_listings": Path("output/rent/listing_details_master.csv"),
    "market_sales": Path("data/dxb_market_sales_predicted.csv"),
    "market_rentals": Path("data/dxb_market_rentals_predicted.csv"),
}


def main():
    DATABASE.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DATABASE) as connection:
        for table_name, csv_path in SOURCES.items():
            if not csv_path.exists():
                raise FileNotFoundError(f"Missing source file: {csv_path}")

            dataframe = pd.read_csv(csv_path, low_memory=False)
            dataframe.to_sql(
                table_name,
                connection,
                if_exists="replace",
                index=False,
            )

            print(f"Created {table_name}: {len(dataframe)} rows")

        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_sale_url "
            "ON sale_listings(url)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_rental_url "
            "ON rental_listings(url)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_sale_active "
            "ON sale_listings(is_active)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_rental_active "
            "ON rental_listings(is_active)"
        )

    print(f"Database created: {DATABASE.resolve()}")


if __name__ == "__main__":
    main()