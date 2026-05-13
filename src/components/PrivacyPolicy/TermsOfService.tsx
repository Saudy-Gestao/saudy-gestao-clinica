export function TermsOfService() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif', color: '#222', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Termos de Serviço</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Última atualização: maio de 2025</p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>1. Aceitação dos termos</h2>
      <p>
        Ao utilizar a plataforma <strong>Saudy Gestão</strong>, você concorda com os presentes Termos de Serviço.
        Se não concordar com algum ponto, não utilize os serviços.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>2. Descrição dos serviços</h2>
      <p>
        A Saudy Gestão oferece uma plataforma de gestão clínica que inclui:
      </p>
      <ul>
        <li>Agendamento e confirmação de consultas via WhatsApp e portal web.</li>
        <li>Prontuário eletrônico e gestão de exames e laudos.</li>
        <li>Teleconsulta por videochamada.</li>
        <li>Check-in digital com reconhecimento facial opcional.</li>
        <li>Comunicação entre clínicas e pacientes.</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>3. Cadastro e acesso</h2>
      <p>
        Para utilizar a plataforma, é necessário fornecer informações verdadeiras e atualizadas.
        Você é responsável pela confidencialidade de suas credenciais de acesso e por todas as
        atividades realizadas com sua conta.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>4. Uso aceitável</h2>
      <p>É proibido:</p>
      <ul>
        <li>Utilizar a plataforma para fins ilegais ou não autorizados.</li>
        <li>Tentar acessar dados de outros usuários sem autorização.</li>
        <li>Enviar conteúdo ofensivo, fraudulento ou que viole direitos de terceiros.</li>
        <li>Realizar engenharia reversa ou tentativas de comprometer a segurança do sistema.</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>5. Dados de saúde</h2>
      <p>
        As informações de saúde inseridas na plataforma são de caráter confidencial e tratadas conforme
        nossa <a href="/privacidade">Política de Privacidade</a> e a LGPD. A clínica é responsável pelo
        correto uso dos dados dos seus pacientes dentro da plataforma.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>6. Responsabilidades</h2>
      <p>
        A Saudy Gestão disponibiliza a plataforma como ferramenta de apoio à gestão clínica.
        Não nos responsabilizamos por:
      </p>
      <ul>
        <li>Decisões clínicas tomadas com base nas informações registradas na plataforma.</li>
        <li>Indisponibilidade temporária do serviço por manutenção ou falhas de infraestrutura.</li>
        <li>Dados inseridos incorretamente pelos usuários ou pelas clínicas.</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>7. Propriedade intelectual</h2>
      <p>
        Todo o conteúdo da plataforma — incluindo código, design, logotipos e textos — é de propriedade
        da Saudy Gestão e protegido por leis de propriedade intelectual. É vedada a reprodução ou
        distribuição sem autorização prévia.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>8. Suspensão e encerramento</h2>
      <p>
        Reservamos o direito de suspender ou encerrar o acesso de usuários que violem estes termos,
        sem aviso prévio. O encerramento da conta não exclui as obrigações legais de retenção de dados.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>9. Modificações</h2>
      <p>
        Podemos atualizar estes Termos a qualquer momento. Alterações relevantes serão comunicadas
        com antecedência mínima de 10 dias. O uso continuado da plataforma após as alterações
        implica aceitação dos novos termos.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>10. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de
        São Paulo/SP para dirimir eventuais controvérsias, com renúncia a qualquer outro, por
        mais privilegiado que seja.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>11. Contato</h2>
      <p>
        Dúvidas sobre estes Termos: <a href="mailto:contato@saudygestao.com.br">contato@saudygestao.com.br</a>
      </p>

      <hr style={{ marginTop: 48, borderColor: '#eee' }} />
      <p style={{ color: '#999', fontSize: 13, textAlign: 'center' }}>
        © {new Date().getFullYear()} Saudy Gestão. Todos os direitos reservados.
      </p>
    </div>
  );
}
