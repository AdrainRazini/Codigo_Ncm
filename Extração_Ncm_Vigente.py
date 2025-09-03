import openpyxl
import json
from datetime import datetime

# Carregar a planilha
arquivo = "Tabela_NCM_Vigente_20250903.xlsx"
wb = openpyxl.load_workbook(arquivo)
ws = wb.active

# Colunas (A → G)
COL_CODIGO = 1
COL_DESC = 2
COL_DATA_INICIO = 3
COL_DATA_FIM = 4
COL_ATO_LEGAL = 5
COL_NUMERO = 6
COL_ANO = 7

# Função para formatar datas
def formatar_data(valor):
    if isinstance(valor, datetime):
        return valor.strftime("%d/%m/%Y")
    return str(valor).strip() if valor else ""

# Lista final
dados_ncm = []

# Ler linhas (pulando cabeçalho)
for row in ws.iter_rows(min_row=2, values_only=True):
    codigo = row[COL_CODIGO - 1]
    if not codigo:
        continue

    item = {
        "Codigo": str(codigo).strip(),  # mantém pontos e formatação original
        "Descricao": str(row[COL_DESC - 1]).strip() if row[COL_DESC - 1] else "",
        "Data_Inicio": formatar_data(row[COL_DATA_INICIO - 1]),
        "Data_Fim": formatar_data(row[COL_DATA_FIM - 1]),
        "Ato_Legal_Inicio": str(row[COL_ATO_LEGAL - 1]).strip() if row[COL_ATO_LEGAL - 1] else "",
        "Numero": str(row[COL_NUMERO - 1]).strip() if row[COL_NUMERO - 1] else "",
        "Ano": str(row[COL_ANO - 1]).strip() if row[COL_ANO - 1] else ""
    }
    dados_ncm.append(item)

# Salvar em JSON
with open("ncm.json", "w", encoding="utf-8") as f:
    json.dump(dados_ncm, f, indent=4, ensure_ascii=False)

print("Arquivo 'ncm.json' gerado com sucesso!")
