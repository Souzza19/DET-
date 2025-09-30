import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// Configura o handler de notificação para mostrar o alerta mesmo com o app aberto
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// -------------------- FUNÇÃO DE FORMATAÇÃO DE DURAÇÃO --------------------
const formatDuration = (minutesStr) => {
  const totalMinutes = parseInt(minutesStr, 10);
  if (isNaN(totalMinutes) || totalMinutes <= 0) {
    return "Duração não definida";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || totalMinutes < 60) {
    parts.push(`${minutes} min`);
  }
  
  if (parts.length === 0) {
      return "0 min";
  }

  return parts.join(' ');
};


// -------------------- HOME SCREEN --------------------
function HomeScreen({ navigation }) {
  return (
    <View style={stylesHome.container}>
      <Text style={stylesHome.title}>DET</Text>
      <TouchableOpacity
        style={stylesHome.button}
        onPress={() => navigation.navigate("Diário")}
      >
        <Image
          source={{
            uri: "https://img.icons8.com/ios-filled/50/ffffff/planner.png",
          }}
          style={{ width: 30, height: 30, tintColor: "#fff" }}
        />
        <Text style={stylesHome.buttonText}>Ir para o Diário</Text>
      </TouchableOpacity>
    </View>
  );
}

// -------------------- ACTIVITIES SCREEN --------------------
function ActivitiesScreen() {
  const [sessions, setSessions] = useState([]);
  const [task, setTask] = useState("");
  const [category, setCategory] = useState("Estudo");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  // ESTADOS PARA DATE & TIME PICKER
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false); 
  const [activityTime, setActivityTime] = useState(new Date()); 
  const [activityDate, setActivityDate] = useState(new Date()); 
  
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");

  // Modal edição
  const [isModalVisible, setModalVisible] = useState(false);
  const [editText, setEditText] = useState("");
  const [editDurationHours, setEditDurationHours] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState("");
  const [editId, setEditId] = useState(null);

  // NOVO: Horas e Minutos para o lembrete
  const [reminderHours, setReminderHours] = useState("0");
  const [reminderMinutesInput, setReminderMinutesInput] = useState("5"); 

  useEffect(() => {
    loadSessions();
    const requestPermissions = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão Negada', 'Não será possível agendar lembretes sem permissão de notificação.');
        }
    };
    requestPermissions();
  }, []);

  const loadSessions = async () => {
    const data = await AsyncStorage.getItem("sessions");
    if (data) setSessions(JSON.parse(data));
  };

  const saveSessions = async (newSessions) => {
    setSessions(newSessions);
    await AsyncStorage.setItem("sessions", JSON.stringify(newSessions));
  };

  const scheduleNotification = async (title, time) => {
    // CÁLCULO TOTAL DE MINUTOS PARA O LEMBRETE
    const hours = parseInt(reminderHours || "0", 10);
    const minutes = parseInt(reminderMinutesInput || "0", 10);
    const totalReminderMinutes = (hours * 60) + minutes;

    if (totalReminderMinutes <= 0) return;

    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== 'granted') return;

    const triggerTime = new Date(time.getTime() - totalReminderMinutes * 60000);
    
    if (triggerTime > new Date()) { 
      try {
          await Notifications.scheduleNotificationAsync({
              content: {
                  title: "Lembrete de Atividade",
                  body: `${title} vai começar em breve (lembrete de ${hours}h ${minutes}m)!`,
              },
              trigger: triggerTime, 
          });
      } catch (e) {
          console.error("Erro ao agendar notificação:", e);
      }
    }
  };

  const addSession = () => {
    const hours = parseInt(durationHours || "0", 10);
    const minutes = parseInt(durationMinutes || "0", 10);
    const totalMinutes = (hours * 60) + minutes;

    if (!task || totalMinutes === 0) {
        Alert.alert("Erro", "Preencha a tarefa e defina uma duração válida (horas ou minutos).");
        return;
    }

    // 1. COMBINA DATA E HORA
    const scheduledDateTime = new Date(activityDate);
    scheduledDateTime.setHours(activityTime.getHours());
    scheduledDateTime.setMinutes(activityTime.getMinutes());
    scheduledDateTime.setSeconds(0);
    scheduledDateTime.setMilliseconds(0);
    
    const now = new Date();
    
    if (scheduledDateTime < now) {
        Alert.alert("Aviso", "A data e hora agendada já passaram. A atividade será salva, mas o lembrete pode não ser disparado.");
    }

    const newSession = {
      id: Date.now().toString(),
      task,
      category,
      duration: totalMinutes.toString(), 
      // Salva a data e hora formatadas para exibição (ex: 26/09/2025 15:45)
      time: scheduledDateTime.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      done: false,
    };
    const updated = [...sessions, newSession];
    saveSessions(updated);
    
    scheduleNotification(task, scheduledDateTime); 
    
    setTask("");
    setDurationHours("");
    setDurationMinutes("");
  };

  const toggleDone = (id) => {
    const updated = sessions.map((s) =>
      s.id === id ? { ...s, done: !s.done } : s
    );
    saveSessions(updated);
  };

  const deleteTask = (id) => {
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    setModalVisible(false);
  };
  
  const confirmDelete = (id, taskName) => {
    Alert.alert(
      "Confirmar Exclusão",
      `Tem certeza que deseja excluir a atividade "${taskName}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          onPress: () => deleteTask(id),
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const openEditModal = (session) => {
    const totalMinutes = parseInt(session.duration || "0", 10);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    setEditId(session.id);
    setEditText(session.task);
    setEditDurationHours(hours.toString());
    setEditDurationMinutes(minutes.toString()); 
    setModalVisible(true);
  };

  const saveEditedTask = () => {
    const hours = parseInt(editDurationHours || "0", 10);
    const minutes = parseInt(editDurationMinutes || "0", 10);
    const totalMinutes = (hours * 60) + minutes;

    if (!editText.trim() || totalMinutes === 0) {
      Alert.alert("Erro", "Preencha a tarefa e defina uma duração válida.");
      return;
    }
    
    const updated = sessions.map((s) =>
      s.id === editId ? { 
          ...s, 
          task: editText, 
          duration: totalMinutes.toString() 
      } : s
    );
    saveSessions(updated);
    setModalVisible(false);
  };

  // ------------------- LÓGICA DE FILTRAGEM E ORDENAÇÃO -------------------
  let currentSessions = sessions;
  
  const filteredSessions = currentSessions.filter((s) => {
    if (filter === "done") return s.done;
    if (filter === "pending") return !s.done;
    return true;
  });

  if (sortOrder !== "default") {
    filteredSessions.sort((a, b) => {
      const nameA = a.task.toUpperCase();
      const nameB = b.task.toUpperCase();

      if (nameA < nameB) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (nameA > nameB) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  // -----------------------------------------------------------------------

  const toggleSort = () => {
    if (sortOrder === 'asc') {
        setSortOrder('desc');
    } else if (sortOrder === 'desc') {
        setSortOrder('default');
    } else {
        setSortOrder('asc');
    }
  };


  // Componente de Item da Lista
  const SessionItem = ({ item }) => {
    const checkIconUrl = item.done 
        ? "https://img.icons8.com/ios-filled/50/6200ee/checked--v1.png" 
        : "https://img.icons8.com/ios/50/checked--v1.png"; 

    const editIconUrl = "https://img.icons8.com/ios-filled/50/6200ee/edit--v1.png";
    const deleteIconUrl = "https://img.icons8.com/ios-filled/50/fa5252/trash--v1.png"; 

    const formattedDuration = formatDuration(item.duration);

    return (
      <View style={[styles.sessionItemContainer, item.done && styles.sessionItemDone]}>
        
        {/* Ícone de Conclusão e Texto da Tarefa */}
        <TouchableOpacity 
            style={styles.taskInfo}
            onPress={() => toggleDone(item.id)}
        >
            <Image 
                source={{ uri: checkIconUrl }} 
                style={styles.iconCheck} 
            />
            <View>
                <Text
                    style={[
                    styles.sessionText,
                    { textDecorationLine: item.done ? "line-through" : "none" },
                    ]}
                >
                    {item.task}
                </Text>
                <Text style={styles.sessionDate}>
                    {item.time} - {formattedDuration} ({item.category})
                </Text>
            </View>
        </TouchableOpacity>

        {/* Botões de Ação */}
        <View style={styles.sessionActions}>
          
          {/* Botão Editar (Lápis) */}
          <TouchableOpacity 
            onPress={() => openEditModal(item)}
            style={styles.actionButton}
          >
            <Image 
              source={{ uri: editIconUrl }} 
              style={styles.iconEdit} 
            />
          </TouchableOpacity>
          
          {/* Botão Excluir (Lixeira) */}
          <TouchableOpacity 
            onPress={() => confirmDelete(item.id, item.task)}
            style={styles.actionButton}
          >
            <Image 
              source={{ uri: deleteIconUrl }} 
              style={styles.iconDelete} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      
      <TextInput
        style={styles.input}
        placeholder="Atividade"
        value={task}
        onChangeText={setTask}
      />

      {/* Dropdown Categoria */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() =>
            setCategory(category === "Estudo" ? "Treino" : "Estudo")
          }
        >
          <Text style={styles.dropdownButtonText}>{category}</Text>
        </TouchableOpacity>
      </View>

      {/* DURAÇÃO (HORAS E MINUTOS) */}
      <View style={styles.durationInputContainer}>
        <TextInput
          style={[styles.input, styles.durationInput]}
          placeholder="Horas (opcional)"
          keyboardType="numeric"
          value={durationHours}
          onChangeText={setDurationHours}
        />
        <TextInput
          style={[styles.input, styles.durationInput]}
          placeholder="Minutos"
          keyboardType="numeric"
          value={durationMinutes}
          onChangeText={setDurationMinutes}
        />
      </View>
      
      {/* ESCOLHER DATA */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: '#4CAF50' }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.addButtonText}>
          Dia: {activityDate.toLocaleDateString()}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={activityDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setActivityDate(selectedDate);
          }}
        />
      )}
      
      {/* Escolher Hora */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.addButtonText}>
          Horário:{" "}
          {activityTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={activityTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) setActivityTime(selectedTime);
          }}
        />
      )}

      {/* NOVO: Horas e Minutos antes para notificar */}
      <Text style={styles.label}>Lembrar-me antes:</Text>
      <View style={styles.durationInputContainer}>
        <TextInput
          style={[styles.input, styles.durationInput]}
          placeholder="Horas"
          keyboardType="numeric"
          value={reminderHours}
          onChangeText={setReminderHours}
        />
        <TextInput
          style={[styles.input, styles.durationInput]}
          placeholder="Minutos"
          keyboardType="numeric"
          value={reminderMinutesInput}
          onChangeText={setReminderMinutesInput}
        />
      </View>

      {/* Botão adicionar */}
      <TouchableOpacity style={styles.addButton} onPress={addSession}>
        <Text style={styles.addButtonText}>Adicionar</Text>
      </TouchableOpacity>

      {/* Filtros e ORDENAÇÃO */}
      <View style={styles.filterContainer}>
        {/* Filtros de Status (Feitos/Pendentes/Todos) */}
        {["all", "pending", "done"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={{ color: filter === f ? "#fff" : "#000" }}>
              {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Feitos"}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Botão de Ordenação A-Z */}
        <TouchableOpacity
            style={[
              styles.filterButton,
              sortOrder !== 'default' && styles.filterButtonActive,
            ]}
            onPress={toggleSort}
        >
            <Text style={{ color: sortOrder !== 'default' ? "#fff" : "#000" }}>
                {sortOrder === 'asc' ? "A-Z ↓" : sortOrder === 'desc' ? "Z-A ↑" : "A-Z"}
            </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>Nenhuma atividade</Text>
        }
        renderItem={({ item }) => <SessionItem item={item} />} 
      />

      {/* Modal de Edição (Tarefa e Duração) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar Atividade</Text>
            
            {/* Input para Editar a TAREFA */}
            <TextInput
              style={[styles.modalInput, {marginBottom: 10}]}
              placeholder="Nome da Atividade"
              value={editText}
              onChangeText={setEditText}
              autoFocus={true}
            />

            {/* Input para Editar a DURAÇÃO (Horas e Minutos) */}
            <View style={styles.durationInputContainer}>
              <TextInput
                style={[styles.modalInput, styles.durationInput, {marginBottom: 0}]}
                placeholder="Horas"
                keyboardType="numeric"
                value={editDurationHours}
                onChangeText={setEditDurationHours}
              />
              <TextInput
                style={[styles.modalInput, styles.durationInput, {marginBottom: 0}]}
                placeholder="Minutos"
                keyboardType="numeric"
                value={editDurationMinutes}
                onChangeText={setEditDurationMinutes}
              />
            </View>
            <Text style={styles.modalHelperText}>
                Duração total: {formatDuration(parseInt(editDurationHours || "0", 10) * 60 + parseInt(editDurationMinutes || "0", 10))}
            </Text>


            <View style={styles.modalButtonContainer}>
              {/* Botão CANCELAR */}
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              {/* Botão SALVAR EDIÇÃO */}
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={saveEditedTask}
              >
                <Text style={styles.modalButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// -------------------- NAVEGAÇÃO --------------------
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Diário" component={ActivitiesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// -------------------- STYLES --------------------
const stylesHome = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 40, fontWeight: "bold", marginBottom: 40, color: "#6200ee" },
  button: { flexDirection: "row", alignItems: "center", backgroundColor: "#6200ee", padding: 15, borderRadius: 10 },
  buttonText: { color: "#fff", fontSize: 18, marginLeft: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginVertical: 6, borderRadius: 6 },
  addButton: { backgroundColor: "#6200ee", padding: 12, borderRadius: 6, alignItems: "center", marginTop: 6 },
  addButtonText: { color: "#fff", fontWeight: "700" },
  dropdownContainer: { marginVertical: 6 },
  dropdownButton: { backgroundColor: "#6200ee", padding: 10, borderRadius: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownButtonText: { color: "#fff", fontWeight: "600" },
  label: {
      fontSize: 14,
      marginTop: 6,
      marginBottom: 3,
      color: '#333',
      fontWeight: '600'
  },
  
  // Estilos de Filtro e Ordenação
  filterContainer: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10, flexWrap: 'wrap' },
  filterButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: "#ddd",
    margin: 3, 
  },
  filterButtonActive: { backgroundColor: "#6200ee", borderColor: "#6200ee" },
  
  // Estilos de Duração Dupla
  durationInputContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  durationInput: {
    flex: 1,
    marginHorizontal: 4,
    textAlign: 'center',
  },

  // Estilos da Lista
  sessionItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#6200ee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  sessionItemDone: {
    borderLeftColor: '#aaa',
    backgroundColor: '#ededed',
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionText: { 
    fontSize: 16, 
    fontWeight: '500', 
    maxWidth: '90%' 
  },
  sessionDate: { 
    fontSize: 12, 
    color: 'gray' 
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  iconCheck: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: '#6200ee',
  },
  iconEdit: {
    width: 24,
    height: 24,
    tintColor: '#2196F3',
  },
  iconDelete: {
    width: 24,
    height: 24,
    tintColor: '#FA5252',
  },
  
  // Estilos Gerais do Modal
  emptyListText: { textAlign: "center", marginTop: 30, color: "#666" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContainer: { backgroundColor: "#fff", padding: 20, borderRadius: 8, width: "90%" },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#6200ee",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  modalHelperText: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 4,
    minWidth: 90,
  },
  modalCancelButton: {
    backgroundColor: "#aaa",
  },
  modalSaveButton: {
    backgroundColor: "#6200ee",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: 'center',
  },
});



