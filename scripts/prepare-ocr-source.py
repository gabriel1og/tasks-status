"""Prepare the reviewed OCR source snapshot; python scripts/prepare-ocr-source.py CSV MARKDOWN."""
import csv
import hashlib
import json
import re
import sys
from pathlib import Path

# Explicit association by CSV document order, including the two unassociated documents.
ASSOCIATIONS = [None, "correios", "3bw", "prieto", "bridge", "altbit", "r10", "btg", "aquiles", "mit",
                "tempmaster", "locsan", "agl", "an57", "medicar", "eutox", "saura", "frontal", "alugasolda",
                "3nm", "csenergy", "lma", "newbe", "uber", "orleans", "airliquide", "movida", "sulamerica",
                "atto", "rlc", "albonett", "exal", "semparar", "jauricio", "rbelectric", "barreto", "vfv",
                "dcd", "instrumen", "araco", None]
REQUIRED = {"Número do documento": "document_number", "Data de emissão": "issue_date",
            "CPF/CNPJ do destinatário": "recipient_tax_id", "Valor bruto": "gross_value",
            "Valor do serviço": "service_value", "Descrição do serviço": "description"}


def clean_cell(value):
    return value.strip().strip("`").replace(r"\|", "|")


def extract_fields(section):
    table = section.split("**Campos —", 1)[1].split("**Conferência local", 1)[0]
    result = []
    for line in table.splitlines():
        cells = [clean_cell(cell) for cell in re.split(r"(?<!\\)\|", line.strip())[1:-1]]
        if len(cells) != 8 or cells[1] not in ("Obrigatório", "Condicional"):
            continue
        label, obligation, available, regex, expected, *_ = cells
        result.append({"key": REQUIRED.get(label, "extra_" + hashlib.sha256(label.encode()).hexdigest()[:12]),
                       "label": label, "required": obligation == "Obrigatório", "availability": available,
                       "regex": "" if regex == "—" else regex, "expected": "" if expected == "Não informado" else expected})
    return result


def prepare_snapshot(csv_file, markdown_file):
    with Path(csv_file).open(encoding="cp1252", newline="") as csv_stream:
        rows = list(csv.DictReader(csv_stream, delimiter=";"))
    rows = [row for row in rows if row["Nome do arquivo"].strip()]
    if len(rows) != len(ASSOCIATIONS):
        raise ValueError(f"Expected 41 document rows, received {len(rows)}; review explicit associations")
    markdown = Path(markdown_file).read_text(encoding="utf-8-sig")
    sections = dict(re.findall(r'<a id="layout-([^"]+)"></a>\s*(.*?)(?=<a id=|\Z)', markdown, re.S))
    documents = []
    for index, (row, anchor) in enumerate(zip(rows, ASSOCIATIONS)):
        section = sections[anchor] if anchor else ""
        supplier = re.search(r"^### (.+)$", section, re.M)
        fallback_supplier = {0: "LINKEDIN IRELAND UNLIMITED", 40: "CLUB COWORKING"}.get(index, row["Nome do arquivo"])
        documents.append({"original": row, "anchor": anchor, "supplier": supplier[1] if supplier else fallback_supplier,
                          "fields": extract_fields(section) if anchor else [],
                          "boleto": bool(re.search(r"boleto[^\n]*presente|boleto presente ou citado", section, re.I))})
    return {"version": "modular-2026-10-21-v1", "documents": documents}


if __name__ == "__main__":
    snapshot = prepare_snapshot(*sys.argv[1:3])
    destination = Path(__file__).resolve().parents[1] / "lib/ocr-tracking/initial-source.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(snapshot['documents'])} documents in {destination}")
