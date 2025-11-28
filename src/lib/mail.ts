import nodemailer from 'nodemailer';

const port = Number(process.env.SMTP_PORT) || 587;

// Configuração do Transporter (Hostinger / SSL)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: port,
  secure: port === 465, // Se for 465, ativa SSL. Se for 587, usa TLS explícito.
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Estilo Visual do E-mail
const emailStyles = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
  color: #333; 
  line-height: 1.6;
  max-width: 600px; 
  margin: 0 auto; 
  border: 1px solid #e2e8f0; 
  border-radius: 12px; 
  overflow: hidden;
  background-color: #f8fafc;
`;

const headerStyle = `
  background-color: #059669; 
  padding: 24px; 
  text-align: center; 
  color: white; 
  font-weight: bold; 
  font-size: 22px;
  letter-spacing: 1px;
`;

const bodyStyle = `
  padding: 32px 24px; 
  background-color: #ffffff;
`;

const btnStyle = `
  background-color: #059669; 
  color: white !important; 
  padding: 14px 28px; 
  text-decoration: none; 
  border-radius: 8px; 
  font-weight: bold; 
  display: inline-block;
  box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);
`;

const footerStyle = `
  padding: 24px; 
  background-color: #f1f5f9; 
  text-align: center; 
  font-size: 12px; 
  color: #64748b;
`;

interface SendEmailProps {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}

export async function sendEmail({ to, subject, title, message, actionLabel, actionUrl }: SendEmailProps) {
  if (!process.env.SMTP_HOST) {
    console.log(`[EMAIL MOCK] Para: ${to} | Assunto: ${subject}`);
    return;
  }

  try {
    const html = `
      <div style="${emailStyles}">
        <div style="${headerStyle}">Econoplan</div>
        <div style="${bodyStyle}">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; margin-bottom: 16px;">${title}</h2>
          <div style="color: #475569; font-size: 16px; margin-bottom: 24px;">${message}</div>
          
          ${actionUrl ? `
            <div style="margin: 32px 0; text-align: center;">
              <a href="${actionUrl}" target="_blank" style="${btnStyle}">
                ${actionLabel || 'Acessar Painel'}
              </a>
            </div>
          ` : ''}
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 13px; color: #94a3b8;">Se você não realizou esta ação, ignore este e-mail.</p>
        </div>
        <div style="${footerStyle}">
          © ${new Date().getFullYear()} Econoplan - Controle Financeiro Inteligente
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Econoplan" <atendimento@econoplan.cloud>',
      to,
      subject,
      html,
    });
    
    console.log(`[EMAIL] Enviado para ${to}`);
  } catch (error) {
    console.error("[EMAIL ERROR]", error);
  }
}
