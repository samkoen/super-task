import pytest

from app.domain.agroline_delivery import kind_from_group, map_agroline_delivery


def _header(**extra):
    row = {
        "Delivery_Num": 2315109,
        "Delivery_Sub": 0,
        "Customer_Name": "שפע כנסת יחזקאל",
        "GroupDesc": "טריים",
        "Delivery_Date": "2026-10-02T00:00:00",
    }
    row.update(extra)
    return row


def test_maps_fresh_teuda_lines_and_ignores_other_delivery():
    document = map_agroline_delivery(
        _header(),
        [
            {"Delivery_Num": 2315109, "ProductDesc": "עגבניות", "Quantity": 12, "Pack_Name": "ק״ג"},
            {"Delivery_Num": 2315108, "ProductDesc": "מלפפון", "Quantity": 4, "Pack_Name": "ק״ג"},
        ],
        pdf_url="https://files/2315109.pdf",
        fallback_date="2026-10-02",
    )
    assert document["agroline_number"] == "2315109"
    assert document["kind"] == "fresh"
    assert document["lines"] == [
        {
            "product_name": "עגבניות",
            "quantity": 12,
            "unit": "ק״ג",
            "origin_name": None,
            "weight": None,
            "price": None,
            "image_url": None,
        }
    ]
    assert document["pdf_url"] == "https://files/2315109.pdf"


def test_mixed_group_and_sub_number():
    assert kind_from_group("מגוון") == "mixed"
    document = map_agroline_delivery(
        _header(GroupDesc="מגוון", Delivery_Sub=2),
        [{"Delivery_Num": 2315109, "Delivery_Sub": 2, "ProductDesc": "בננה", "WeightBrutto": 3}],
        pdf_url=None,
        fallback_date="2026-10-02",
    )
    assert document["agroline_number"] == "2315109-2"
    assert document["kind"] == "mixed"
    assert document["lines"][0]["quantity"] == 3
    assert document["lines"][0]["unit"] == "יח"


def test_origin_keeps_the_country_and_ignores_the_grower_code():
    country = map_agroline_delivery(
        _header(),
        [{
            "Delivery_Num": 2315109,
            "ProductDesc": "תפוח מוזהב יבוא",
            "Quantity": 1,
            "Pack_Name": "קרטון",
            "OriginCountryDesc": "איטליה",
            "GrowerName": "Vog",
        }],
        pdf_url=None,
        fallback_date="2026-10-02",
    )
    grower = map_agroline_delivery(
        _header(),
        [{
            "Delivery_Num": 2315109,
            "ProductDesc": "תפוח מוזהב יבוא",
            "Quantity": 1,
            "Pack_Name": "קרטון",
            "GrowerName": "  Vog  ",
        }],
        pdf_url=None,
        fallback_date="2026-10-02",
    )
    assert country["lines"][0]["origin_name"] == "איטליה"
    assert grower["lines"][0]["origin_name"] is None


def test_line_keeps_weight_price_and_the_product_photo():
    document = map_agroline_delivery(
        _header(),
        [{
            "Delivery_Num": 2315109,
            "ProductDesc": "תפוח מוזהב יבוא",
            "Quantity": 1,
            "Pack_Name": "קרטון גדול 0.5",
            "WeightNeto": 9.23,
            "SalePrice": 10.5,
            "GeneralProductID": 194,
        }],
        pdf_url=None,
        fallback_date="2026-10-02",
    )
    line = document["lines"][0]
    assert line["quantity"] == 1
    assert line["weight"] == 9.23
    assert line["price"] == 10.5
    assert line["image_url"] == "https://my.agroline.co.il/v1/images/products/194.png"


def test_missing_measure_and_photo_stay_empty():
    document = map_agroline_delivery(
        _header(),
        [{
            "Delivery_Num": 2315109,
            "ProductDesc": "מלפפון",
            "Quantity": 2,
            "Pack_Name": "קרטון",
            "GeneralProductID": 0,
        }],
        pdf_url=None,
        fallback_date="2026-10-02",
    )
    line = document["lines"][0]
    assert line["weight"] is None
    assert line["price"] is None
    assert line["image_url"] is None


def test_missing_lines_are_rejected():
    with pytest.raises(ValueError, match="שורות"):
        map_agroline_delivery(_header(), [], pdf_url=None, fallback_date="2026-10-02")
