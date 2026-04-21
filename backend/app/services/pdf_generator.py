import os
import base64
from datetime import datetime
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader
from app.models.incident import Incident
from app.models.school import School
from app.models.user import User
from app.config import settings

# Configurar Jinja2
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'templates')
env = Environment(loader=FileSystemLoader(template_dir))

# Caminho da logo
LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "logo.png")


def get_logo_base64() -> str | None:
    """Retorna a logo em formato base64 se existir."""
    if os.path.exists(LOGO_PATH):
        with open(LOGO_PATH, "rb") as f:
            logo_data = base64.b64encode(f.read()).decode()
        return f"data:image/png;base64,{logo_data}"
    return None


def get_date_extenso(date: datetime) -> str:
    """Converte data para formato por extenso em português."""
    meses = {
        1: "janeiro", 2: "fevereiro", 3: "março", 4: "abril",
        5: "maio", 6: "junho", 7: "julho", 8: "agosto",
        9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro"
    }
    return f"{date.day} de {meses[date.month]} de {date.year}"


def _resolve_incident_date(value: object, fallback: datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            return fallback
    return fallback


def build_oficio_context(
    incident: Incident,
    school: School,
    operator: User,
    texto_oficio: str | None = None,
    overrides: dict | None = None,
    now: datetime | None = None
) -> dict:
    overrides = overrides or {}
    now = now or datetime.now()

    incident_date = _resolve_incident_date(overrides.get("incident_date"), incident.incident_date)
    process_number = overrides.get("process_number") or incident.process_number
    unidade_escolar = overrides.get("unidade_escolar") or incident.unidade_escolar or school.name
    endereco_escola = overrides.get("endereco_escola") or school.address or "Endereço não informado"
    localizacao_interna = overrides.get("localizacao_interna") or incident.location
    categoria = overrides.get("categoria") or incident.setor or incident.category
    nivel_impacto = overrides.get("nivel_impacto") or incident.impact_level
    descricao = overrides.get("descricao") or incident.description

    providencias_raw = overrides.get("providencias")
    if providencias_raw is None:
        providencias_text = (incident.actions_taken or "").strip()
    else:
        providencias_text = str(providencias_raw).strip()
    if not providencias_text:
        providencias_text = "Nenhuma providência registrada até o momento."

    status = overrides.get("status") or incident.status
    texto_final = overrides.get("texto_oficio")
    if texto_final is None:
        texto_final = texto_oficio or ""

    return {
        'processo_numero': process_number,
        'requerente': settings.ORGANIZATION_NAME,
        'organizacao': settings.ORGANIZATION_NAME,
        'departamento': settings.DEPARTMENT_NAME,
        'cidade_label': settings.CITY_LABEL,
        'assunto': f'{categoria} - {localizacao_interna}',
        'data_extenso': get_date_extenso(incident_date),
        'data_extenso_download': get_date_extenso(now),
        'data_formatada': incident_date.strftime('%d/%m/%Y'),
        'unidade_escolar': unidade_escolar,
        'endereco_escola': endereco_escola,
        'localizacao_interna': localizacao_interna,
        'categoria': categoria,
        'nivel_impacto': nivel_impacto,
        'descricao': descricao,
        'providencias': providencias_text,
        'status': status,
        'texto_oficio': texto_final,
        'operador_nome': operator.full_name,
        'operador_id': operator.id,
        'ano_atual': now.year,
        'logo_base64': get_logo_base64()
    }


def generate_incident_pdf(
    incident: Incident,
    school: School,
    operator: User,
    texto_oficio: str | None = None,
    output_dir: str = "/app/generated_pdfs",
    overrides: dict | None = None
) -> str:
    """
    Gera o PDF do documento baseado no modelo configurado.
    
    Args:
        incident: Objeto do incidente
        school: Objeto da escola
        operator: Objeto do operador
        output_dir: Diretório de saída dos PDFs
    
    Returns:
        Caminho do arquivo PDF gerado
    """
    
    # Garantir que o diretório existe
    os.makedirs(output_dir, exist_ok=True)
    
    # Carregar template
    template = env.get_template('oficio_template.html')
    
    # Preparar dados para o template
    now = datetime.now()
    context = build_oficio_context(
        incident,
        school,
        operator,
        texto_oficio=texto_oficio,
        overrides=overrides,
        now=now
    )
    
    # Renderizar HTML
    html_content = template.render(**context)
    
    # Gerar nome do arquivo
    filename = f"{settings.DOCUMENT_FILENAME_PREFIX}_{incident.process_number.replace('/', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = os.path.join(output_dir, filename)
    
    # Gerar PDF usando WeasyPrint
    html_doc = HTML(string=html_content)
    html_doc.write_pdf(target=filepath)
    
    return filepath


def generate_incident_pdf_bytes(
    incident: Incident,
    school: School,
    operator: User,
    texto_oficio: str | None = None,
    overrides: dict | None = None
) -> bytes:
    template = env.get_template('oficio_template.html')
    context = build_oficio_context(
        incident,
        school,
        operator,
        texto_oficio=texto_oficio,
        overrides=overrides
    )
    html_content = template.render(**context)
    html_doc = HTML(string=html_content)
    return html_doc.write_pdf()


def generate_process_number(year: int, sequence: int) -> str:
    """Gera o número do processo no formato padrão."""
    return f"{settings.PROCESS_NUMBER_PREFIX}/{year}/{sequence:05d}"
