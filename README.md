📅 DET - Diário de estudo e treino

📝 Visão Geral do Projeto
O DET (Diário de estudo e treino) é um aplicativo de planejamento e gestão de atividades diárias focado em flexibilidade de agendamento e confiabilidade de lembretes. Ele resolve o problema de agendar micro-tarefas, garantindo que o usuário defina durações e lembretes precisos, e que as notificações sejam entregues corretamente no futuro, independentemente da hora atual.

✨ Principais Funcionalidades
O DET se destaca pela usabilidade e recursos técnicos avançados:

Agendamento Preciso: O usuário define o Dia e a Hora da atividade usando dois pickers separados.

Duração Flexível (H/M): Permite inserir a duração da atividade em Horas e Minutos (salvando como minutos totais) e formatando para exibição amigável ("1h 30 min").

Notificações Robustas: O sistema de lembretes é configurado em Horas e Minutos antes da atividade e foi corrigido para garantir que os alarmes futuros sejam agendados corretamente via Expo Notifications, mesmo quando o app é reiniciado.

Gestão de Lista Eficiente:

Filtros de status (Todos, Pendentes, Feitos).

Ordenação alfabética (A-Z / Z-A).

Botões de Edição e Exclusão rápidos na lista.

Persistência de Dados: Salva todas as atividades localmente usando AsyncStorage.

🛠️ Stack Tecnológica
O projeto foi construído sobre uma base moderna e confiável:

Framework: React Native

Ambiente: Expo

State Management: React Hooks (useState, useEffect)

Navegação: React Navigation (createStackNavigator)

Persistência: AsyncStorage (@react-native-async-storage/async-storage)

Notificações: Expo Notifications (expo-notifications)

⚙️ Destaques do Código (Para Contribuição)
Os principais Hooks e a lógica central que estruturam o projeto:

💾 Persistência e Ciclo de Vida (useEffect)
O useEffect é o responsável por interagir com o sistema operacional e carregar dados:

Realiza a solicitação de permissões de notificação ao iniciar.

Chama loadSessions() para carregar todas as atividades salvas do AsyncStorage.

💡 Gerenciamento de Estado (useState)
O useState é usado extensivamente para a "memória" do aplicativo:

[sessions, setSessions]: O estado central que armazena a lista completa de todas as atividades.

[filter, setFilter] e [sortOrder, setSortOrder]: Gerenciam a maneira como a lista é exibida na interface.

Controle de UI: Gerencia o estado dos Modais e Pickers (isModalVisible, showDatePicker).

⏰ Lógica de Agendamento e Notificação
A função mais crítica para a funcionalidade do aplicativo:

scheduleNotification(title, time): Calcula o triggerTime (tempo exato de disparo) subtraindo os minutos de lembrete do horário da atividade agendada.

Lógica de Agendamento: Garante que o lembrete só seja agendado (triggerTime > new Date()) se ele estiver no futuro, prevenindo falhas.

🔢 Manipulação de Dados
formatDuration(minutesStr): Função auxiliar que converte o total de minutos (valor salvo) de volta para um formato legível para a interface do usuário (ex: "1h 30 min").

👥 Grupo:

Douglas jeronimo souza ferreira

Rafael Fabiano do Nascimento

Pablo de Matos dos Santos

Thiago Silva de Araujo Rodrigues






