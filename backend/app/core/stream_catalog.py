"""Stream Catalog — Canonical stream/department definitions for eligibility matching."""
from typing import Dict, List, Optional

STREAM_CATALOG: List[Dict] = [
    # ── CS / Computing ────────────────────────────────────────────
    {"code":"CSE",     "name":"Computer Science and Engineering",           "category":"CS",
     "aliases":["cse","cs","computer science","computer science and engineering","b.e. cse","b.tech cse","cse engineering"]},
    {"code":"IT",      "name":"Information Technology",                     "category":"CS",
     "aliases":["it","information technology","it engineering","infotech"]},
    {"code":"AIDS",    "name":"Artificial Intelligence and Data Science",   "category":"CS",
     "aliases":["aids","ai&ds","ai ds","ai and ds","artificial intelligence and data science","data science","ai data science"]},
    {"code":"AIML",    "name":"Artificial Intelligence and Machine Learning","category":"CS",
     "aliases":["aiml","ai&ml","ai ml","ai and ml","artificial intelligence and machine learning","machine learning"]},
    {"code":"CSBS",    "name":"Computer Science and Business Systems",      "category":"CS",
     "aliases":["csbs","cs & business systems","computer science and business systems"]},
    {"code":"CYBER",   "name":"Cyber Security",                             "category":"CS",
     "aliases":["cyber","cybersecurity","cyber security","information security","is","network security"]},
    # ── Core Engineering ──────────────────────────────────────────
    {"code":"ECE",     "name":"Electronics and Communication Engineering",  "category":"CORE",
     "aliases":["ece","electronics","electronics and communication","electronics & communication","ec"]},
    {"code":"EEE",     "name":"Electrical and Electronics Engineering",     "category":"CORE",
     "aliases":["eee","electrical","electrical and electronics","electrical engineering","ee"]},
    {"code":"EEE_VLSI","name":"EEE — VLSI Design",                         "category":"CORE",
     "aliases":["eee vlsi","vlsi","vlsi design","eee (vlsi)","vlsi engineering"]},
    {"code":"MECH",    "name":"Mechanical Engineering",                    "category":"CORE",
     "aliases":["mech","mechanical","mechanical engineering"]},
    {"code":"CIVIL",   "name":"Civil Engineering",                         "category":"CORE",
     "aliases":["civil","civil engineering","ce","civil engg"]},
    {"code":"MECT",    "name":"Mechatronics Engineering",                  "category":"CORE",
     "aliases":["mechatronics","mct","mect","mechatronics engineering"]},
    {"code":"ETC",     "name":"Electronics and Telecommunication",         "category":"CORE",
     "aliases":["etc","electronics and telecommunication","e&tc","ete"]},
    {"code":"BME",     "name":"Biomedical Engineering",                    "category":"CORE",
     "aliases":["bme","biomedical","biomedical engineering"]},
    # ── PG / Management ───────────────────────────────────────────
    {"code":"MCA",     "name":"Master of Computer Applications",           "category":"PG",
     "aliases":["mca","master of computer applications"]},
    {"code":"MBA",     "name":"Master of Business Administration",         "category":"MGMT",
     "aliases":["mba","master of business administration","business administration"]},
    {"code":"MTECH",   "name":"M.Tech",                                    "category":"PG",
     "aliases":["mtech","m.tech","master of technology"]},
    {"code":"MSC",     "name":"M.Sc",                                      "category":"PG",
     "aliases":["msc","m.sc","master of science"]},
]

DEGREE_CATALOG: List[Dict] = [
    {"code":"BE",      "name":"B.E.",    "aliases":["be","b.e","b.e.","bachelor of engineering"]},
    {"code":"BTECH",   "name":"B.Tech",  "aliases":["btech","b.tech","b.tech.","bachelor of technology"]},
    {"code":"MTECH",   "name":"M.Tech",  "aliases":["mtech","m.tech","m.tech.","master of technology"]},
    {"code":"ME",      "name":"M.E.",    "aliases":["me","m.e","m.e.","master of engineering"]},
    {"code":"MCA",     "name":"MCA",     "aliases":["mca","master of computer applications"]},
    {"code":"MBA",     "name":"MBA",     "aliases":["mba","master of business administration"]},
    {"code":"MSC",     "name":"M.Sc",    "aliases":["msc","m.sc","master of science"]},
    {"code":"BSC",     "name":"B.Sc",    "aliases":["bsc","b.sc","bachelor of science"]},
    {"code":"DIPLOMA", "name":"Diploma", "aliases":["diploma","poly","polytechnic","lateral entry"]},
]

# Build fast-lookup indices
_CODE_INDEX:       Dict[str, Dict] = {s["code"]: s for s in STREAM_CATALOG}
_ALIAS_INDEX:      Dict[str, str]  = {}
_DEGREE_ALIAS_IDX: Dict[str, str]  = {}
CATEGORY_STREAMS:  Dict[str, List[str]] = {}
ANY_STREAM = "ANY"

for _s in STREAM_CATALOG:
    for _a in _s["aliases"]:
        _ALIAS_INDEX[_a.lower()] = _s["code"]
    CATEGORY_STREAMS.setdefault(_s["category"], []).append(_s["code"])

for _d in DEGREE_CATALOG:
    for _a in _d["aliases"]:
        _DEGREE_ALIAS_IDX[_a.lower()] = _d["code"]


def normalize_stream(raw: str) -> Optional[str]:
    """Any raw department string → canonical code, or None."""
    if not raw:
        return None
    lo = raw.strip().lower()
    if raw.upper() in _CODE_INDEX:
        return raw.upper()
    if lo in _ALIAS_INDEX:
        return _ALIAS_INDEX[lo]
    for alias, code in _ALIAS_INDEX.items():
        if alias in lo or lo in alias:
            return code
    return None


def normalize_degree(raw: str) -> Optional[str]:
    if not raw:
        return None
    lo = raw.strip().lower()
    if raw.upper() in {d["code"] for d in DEGREE_CATALOG}:
        return raw.upper()
    return _DEGREE_ALIAS_IDX.get(lo)


def get_stream_info(code: str) -> Optional[Dict]:
    return _CODE_INDEX.get(code)


def get_category_stream_codes(category: str) -> List[str]:
    return CATEGORY_STREAMS.get(category.upper(), [])


def streams_for_frontend() -> List[Dict]:
    cat_labels = {
        "CS":   "CS / Computing",
        "CORE": "Core Engineering",
        "PG":   "Postgraduate",
        "MGMT": "Management",
    }
    groups: Dict[str, list] = {}
    for s in STREAM_CATALOG:
        groups.setdefault(s["category"], []).append({"code": s["code"], "name": s["name"]})
    return [
        {"category": cat, "label": cat_labels.get(cat, cat), "streams": items}
        for cat, items in groups.items()
    ]


def degrees_for_frontend() -> List[Dict]:
    return [{"code": d["code"], "name": d["name"]} for d in DEGREE_CATALOG]
