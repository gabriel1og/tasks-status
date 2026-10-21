"""Update only the OCR declarations from the local declarative schema; no database connection."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def split_columns(body):
    depth, quoted, start = 0, False, 0
    for index, character in enumerate(body):
        if character == "'":
            quoted = not quoted
        if not quoted:
            depth += (character == "(") - (character == ")")
        if character == "," and not quoted and depth == 0:
            yield body[start:index].strip()
            start = index + 1
    yield body[start:].strip()


def table_columns(body):
    columns = []
    for declaration in split_columns(body):
        match = re.match(r"(\w+)\s+(uuid|text|boolean|integer|jsonb|date|timestamptz)\b", declaration)
        if not match:
            continue
        name, sql_type = match.groups()
        nullable = "NOT NULL" not in declaration and "PRIMARY KEY" not in declaration
        value_type = {"boolean": "boolean", "integer": "number", "jsonb": "Json"}.get(sql_type, "string")
        columns.append((name, value_type + (" | null" if nullable else ""), nullable or "DEFAULT" in declaration))
    return columns


def generate_table(name, body):
    columns = table_columns(body)
    lines = [f"      {name}: {{"]
    for shape in ("Row", "Insert", "Update"):
        lines.append(f"        {shape}: {{")
        for column, value_type, optional in columns:
            marker = "?" if shape == "Update" or (shape == "Insert" and optional) else ""
            lines.append(f"          {column}{marker}: {value_type}")
        lines.append("        }")
    references = re.findall(r"FOREIGN KEY \(([^)]+)\) REFERENCES public\.(\w+)\(([^)]+)\)", body)
    lines.append("        Relationships: [" if references else "        Relationships: []")
    for columns, relation, target_columns in references:
        names = [column.strip() for column in columns.split(",")]
        targets = [column.strip() for column in target_columns.split(",")]
        constraint = name + "_" + "_".join(names) + "_fkey"
        lines.extend(["          {", f'            foreignKeyName: "{constraint}"',
                      "            columns: [" + ", ".join(f'"{column}"' for column in names) + "]",
                      "            isOneToOne: false", f'            referencedRelation: "{relation}"',
                      "            referencedColumns: [" + ", ".join(f'"{column}"' for column in targets) + "]", "          },"])
    if references:
        lines.append("        ]")
    lines.append("      }")
    return "\n".join(lines)


if __name__ == "__main__":
    schema = (ROOT / "supabase/schemas/60_ocr_tracking.sql").read_text(encoding="utf-8")
    tables = re.findall(r"CREATE TABLE public\.(ocr_tracking_\w+) \((.*?)\n\);", schema, re.S)
    if len(tables) != 5:
        raise ValueError(f"Expected five OCR tables, received {len(tables)}")
    destination = ROOT / "types/database.generated.ts"
    generated = destination.read_text(encoding="utf-8")
    generated = re.sub(r"      // BEGIN OCR SCHEMA TYPES.*?      // END OCR SCHEMA TYPES\n", "", generated, flags=re.S)
    addition = "      // BEGIN OCR SCHEMA TYPES (generated offline from 60_ocr_tracking.sql)\n" + "\n".join(generate_table(*table) for table in tables) + "\n      // END OCR SCHEMA TYPES\n"
    generated = generated.replace("    Tables: {\n", "    Tables: {\n" + addition, 1)
    rpc = "    Functions: {\n      import_ocr_tracking: {\n        Args: { p_user_id: string; p_documents: Json }\n        Returns: number\n      }\n    }"
    generated = re.sub(r"    Functions: \{.*?\n    \}", lambda _: rpc, generated, count=1, flags=re.S)
    destination.write_text(generated, encoding="utf-8")
    print("Prepared OCR table and RPC types from the declarative schema; database regeneration remains manual.")
