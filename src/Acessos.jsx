import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Importa o hook useNavigate do react-router-dom
import "./Acessos.css";
const Acessos = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const navigate = useNavigate();

  // Busca os usuários ao carregar o componente
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("https://api-start-pira.vercel.app/api/users");
        setUsers(response.data);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      }
    };

    fetchUsers();
  }, []);

  // Atualiza as permissões de um usuário
  const handlePermissionChange = async (userId, field, value) => {
    try {
      await axios.put(`https://api-start-pira.vercel.app/api/users/${userId}`, {
        [field]: value,
      });

      // Atualiza o estado local com o usuário atualizado
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, [field]: value } : user)));
      
      // Exibe mensagem de sucesso
      setMessage("Permissão atualizada com sucesso!");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } catch (error) {
      console.error("Erro ao atualizar permissões:", error);
      setMessage("Erro ao atualizar permissão!");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  };

  // Atualiza o nome do usuário
  const handleNameChange = async (userId, newName) => {
    try {
      await axios.put(`https://api-start-pira.vercel.app/api/users/${userId}`, {
        name: newName,
      });

      // Atualiza o estado local
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, name: newName } : user)));
      
      // Exibe mensagem de sucesso
      setMessage("Nome atualizado com sucesso!");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      setMessage("Erro ao atualizar nome!");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  };

  return (
    <div className="permissions-manager">
      <h1>Gerenciamento de Permissões</h1>
      
      {showMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: message.includes("sucesso") ? "#4caf50" : "#f44336",
            color: "white",
            padding: "15px 25px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 9999,
            fontSize: "14px",
            fontWeight: "500",
            animation: "slideIn 0.3s ease",
          }}
        >
          {message}
        </div>
      )}
      
      <table>
        <thead>
          <tr>
            <th >
              Nome</th>
            <th className="usuario-acesso">
              Usuário
              <button
                className="btn-cadastrar-usuario"
                onClick={() => navigate("/register")} // Navega para a rota /register
              >
                Cadastrar Usuário
              </button>
            </th>
            <th>Caixa</th>
            <th>Produtos</th>
            <th>Máquinas</th>
            <th>Fiado</th>
            <th>Despesas</th>
            <th>Ponto</th>
            <th>Acessos</th>
            <th>Estoque</th>
            <th>PDV</th>
            <th>Pessoal</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <input
                  type="text"
                  value={user.name || ""}
                  onChange={(e) => setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, name: e.target.value } : u)))}
                  onBlur={(e) => handleNameChange(user.id, e.target.value)}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    padding: "6px",
                    width: "100%",
                    fontSize: "14px",
                    textShadow: "none",
                  }}
                  placeholder="Digite o nome"
                />
              </td>
              <td>{user.username}</td>
              {["caixa", "produtos", "maquinas", "fiado", "despesas", "ponto", "acessos", "base_produto", "pdv", "pessoal"].map((field) => (
                <td key={field}>
                  <input type="checkbox" checked={user[field]} onChange={(e) => handlePermissionChange(user.id, field, e.target.checked)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Acessos;
