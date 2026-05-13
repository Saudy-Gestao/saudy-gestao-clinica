export function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif', color: '#222', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Política de Privacidade</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Última atualização: maio de 2025</p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>1. Quem somos</h2>
      <p>
        A <strong>Saudy Gestão</strong> é uma plataforma de gestão clínica que oferece serviços de agendamento,
        teleconsulta e comunicação entre clínicas e pacientes. Este documento descreve como coletamos, usamos
        e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>2. Dados que coletamos</h2>
      <ul>
        <li><strong>Dados cadastrais:</strong> nome, CPF, data de nascimento, e-mail, telefone.</li>
        <li><strong>Dados de saúde:</strong> histórico de consultas, anamneses, exames e laudos médicos.</li>
        <li><strong>Dados de contato:</strong> mensagens enviadas via WhatsApp para agendamento e confirmação de consultas.</li>
        <li><strong>Dados biométricos:</strong> imagem facial coletada opcionalmente para reconhecimento na chegada à clínica, mediante consentimento expresso.</li>
        <li><strong>Dados de acesso:</strong> endereço IP, data e horário de acesso, tipo de dispositivo.</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>3. Finalidade do tratamento</h2>
      <ul>
        <li>Prestação dos serviços de gestão clínica e agendamento.</li>
        <li>Comunicação sobre consultas, resultados e lembretes via WhatsApp e e-mail.</li>
        <li>Cumprimento de obrigações legais e regulatórias.</li>
        <li>Melhoria e personalização dos serviços oferecidos.</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>4. Base legal</h2>
      <p>
        O tratamento dos seus dados é fundamentado nas seguintes bases legais da LGPD:
      </p>
      <ul>
        <li><strong>Consentimento</strong> (Art. 7º, I) — para dados biométricos e comunicações de marketing.</li>
        <li><strong>Execução de contrato</strong> (Art. 7º, V) — para prestação dos serviços contratados.</li>
        <li><strong>Cumprimento de obrigação legal</strong> (Art. 7º, II) — para dados exigidos por regulamentações de saúde.</li>
        <li><strong>Legítimo interesse</strong> (Art. 7º, IX) — para melhoria dos serviços e prevenção de fraudes.</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>5. Compartilhamento de dados</h2>
      <p>
        Seus dados podem ser compartilhados com:
      </p>
      <ul>
        <li>Profissionais de saúde vinculados à clínica que você frequenta.</li>
        <li>Prestadores de serviço tecnológico (infraestrutura, armazenamento em nuvem), sob acordos de confidencialidade.</li>
        <li>Autoridades públicas, quando exigido por lei.</li>
      </ul>
      <p>Não vendemos nem cedemos seus dados a terceiros para fins comerciais.</p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>6. Retenção de dados</h2>
      <p>
        Os dados são armazenados pelo tempo necessário para a prestação dos serviços e cumprimento de
        obrigações legais. Dados biométricos são excluídos imediatamente após o uso ou mediante solicitação.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>7. Seus direitos</h2>
      <p>Nos termos da LGPD, você tem direito a:</p>
      <ul>
        <li>Confirmar a existência de tratamento dos seus dados.</li>
        <li>Acessar, corrigir ou atualizar seus dados.</li>
        <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
        <li>Revogar o consentimento a qualquer momento.</li>
        <li>Solicitar a portabilidade dos seus dados.</li>
      </ul>
      <p>
        Para exercer seus direitos, entre em contato pelo e-mail: <a href="mailto:privacidade@saudygestao.com.br">privacidade@saudygestao.com.br</a>
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>8. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado,
        perda ou divulgação indevida, incluindo criptografia em trânsito (TLS) e controle de acesso por perfil.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>9. Cookies</h2>
      <p>
        Utilizamos cookies essenciais para o funcionamento da plataforma. Não utilizamos cookies de rastreamento
        de terceiros para fins publicitários.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>10. Contato e DPO</h2>
      <p>
        Em caso de dúvidas ou solicitações relacionadas à privacidade, entre em contato com nosso
        Encarregado de Proteção de Dados (DPO):
      </p>
      <p>
        E-mail: <a href="mailto:privacidade@saudygestao.com.br">privacidade@saudygestao.com.br</a><br />
        Site: <a href="https://saudygestao.com.br" target="_blank" rel="noreferrer">saudygestao.com.br</a>
      </p>

      <hr style={{ marginTop: 48, borderColor: '#eee' }} />
      <p style={{ color: '#999', fontSize: 13, textAlign: 'center' }}>
        © {new Date().getFullYear()} Saudy Gestão. Todos os direitos reservados.
      </p>
    </div>
  );
}
