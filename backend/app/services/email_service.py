import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from typing import List, Optional
from app.config import settings


async def send_email_with_attachment(
    to_emails: List[str],
    subject: str,
    body: str,
    attachment_path: Optional[str] = None
) -> bool:
    """
    Envia e-mail com anexo opcional.
    
    Args:
        to_emails: Lista de destinatários
        subject: Assunto do e-mail
        body: Corpo do e-mail em HTML
        attachment_path: Caminho do arquivo PDF para anexar
    
    Returns:
        True se enviado com sucesso, False caso contrário
    """
    
    if settings.DEMO_MODE and settings.DEMO_DISABLE_EMAIL:
        print(f"[demo-mode] Simulando envio de e-mail para: {', '.join(to_emails)} | assunto: {subject}")
        return True

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("SMTP não configurado. E-mail não enviado.")
        return False
    
    try:
        # Criar mensagem
        message = MIMEMultipart()
        message["From"] = settings.EMAIL_FROM
        message["To"] = ", ".join(to_emails)
        message["Subject"] = subject
        
        # Adicionar corpo do e-mail
        message.attach(MIMEText(body, "html"))
        
        # Adicionar anexo se existir
        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, "rb") as attachment:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.read())
            
            encoders.encode_base64(part)
            filename = os.path.basename(attachment_path)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename= {filename}",
            )
            message.attach(part)
        
        # Enviar e-mail
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
        
        return True
        
    except Exception as e:
        print(f"Erro ao enviar e-mail: {str(e)}")
        return False


async def send_incident_notification(
    incident_data: dict,
    school_name: str,
    operator_name: str,
    pdf_path: str,
    recipient_emails: List[str]
) -> bool:
    """
    Envia notificação de novo incidente por e-mail.
    """
    
    subject = f"[{settings.APP_NAME}] Nova Ocorrencia - {incident_data['process_number']}"
    
    body = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            .header {{ background-color: #1e40af; color: white; padding: 20px; }}
            .content {{ padding: 20px; }}
            .info-box {{ background-color: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 8px; }}
            .label {{ font-weight: bold; color: #374151; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h2>{settings.APP_NAME}</h2>
            <p>{settings.DEPARTMENT_NAME}</p>
        </div>
        <div class="content">
            <h3>Nova Ocorrência Registrada</h3>
            
            <div class="info-box">
                <p><span class="label">Processo Nº:</span> {incident_data['process_number']}</p>
                <p><span class="label">Unidade Escolar:</span> {school_name}</p>
                <p><span class="label">Localização:</span> {incident_data['location']}</p>
                <p><span class="label">Setor:</span> {incident_data.get('setor') or incident_data.get('category')}</p>
                <p><span class="label">Nível de Impacto:</span> {incident_data['impact_level']}</p>
            </div>
            
            <div class="info-box">
                <p><span class="label">Descrição:</span></p>
                <p>{incident_data['description']}</p>
            </div>
            
            <div class="info-box">
                <p><span class="label">Providências Adotadas:</span></p>
                <p>{incident_data.get('actions_taken', 'Nenhuma providência registrada.')}</p>
            </div>
            
            <p><span class="label">Operador Responsável:</span> {operator_name}</p>
            <p><span class="label">Data/Hora:</span> {incident_data['created_at']}</p>
            
            <hr>
            <p><em>O ofício oficial segue em anexo.</em></p>
            <p><small>Este e um e-mail automatico do sistema. Nao responda.</small></p>
        </div>
    </body>
    </html>
    """
    
    return await send_email_with_attachment(
        to_emails=recipient_emails,
        subject=subject,
        body=body,
        attachment_path=pdf_path
    )


async def send_incident_validation_notification(
    recipient_emails: List[str],
    incident_data: dict,
    approved: bool,
    note: Optional[str] = None
) -> bool:
    status_label = "Aprovada" if approved else "Rejeitada"
    subject = f"[{settings.APP_NAME}] Ocorrencia {status_label} - {incident_data['process_number']}"

    note_html = ""
    if note:
        note_html = f"""
        <div class=\"info-box\">
            <p><span class=\"label\">Descricao:</span></p>
            <p>{note}</p>
        </div>
        """

    body = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            .header {{ background-color: #1e40af; color: white; padding: 20px; }}
            .content {{ padding: 20px; }}
            .info-box {{ background-color: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 8px; }}
            .label {{ font-weight: bold; color: #374151; }}
        </style>
    </head>
    <body>
        <div class=\"header\">
            <h2>{settings.APP_NAME}</h2>
            <p>{settings.DEPARTMENT_NAME}</p>
        </div>
        <div class=\"content\">
            <h3>Ocorrência {status_label}</h3>
            <div class=\"info-box\">
                <p><span class=\"label\">Processo Nº:</span> {incident_data['process_number']}</p>
                <p><span class=\"label\">Unidade Escolar:</span> {incident_data['school_name']}</p>
                <p><span class=\"label\">Setor:</span> {incident_data.get('setor')}</p>
            </div>
            {note_html}
            <p><small>Este e um e-mail automatico do sistema. Nao responda.</small></p>
        </div>
    </body>
    </html>
    """

    return await send_email_with_attachment(
        to_emails=recipient_emails,
        subject=subject,
        body=body,
        attachment_path=None
    )
