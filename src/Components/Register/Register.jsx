import axios from "axios";
import React, { useState } from "react";
import { FaLock, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Message from "./MessageRegistro";
import "./Register.css";

const Register = () => {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState(""); // Estado para armazenar a confirmação da senha
  const [passwordError, setPasswordError] = useState(""); // Estado para armazenar a mensagem de erro de senha
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState(""); // Estado para armazenar a mensagem
  const [messageType, setMessageType] = useState(""); // Estado para armazenar o tipo de mensagem

  const navigate = useNavigate();

  const validatePasswords = () => {
    if (password !== passwordConfirm) {
      setPasswordError("As senhas não correspondem");
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    validatePasswords();
    if (passwordError) return; // Se houver erro de senha, não prosseguir com o registro

    console.log("Username:", username, "Password:", password); // Adicione este console.log para verificar os valores
    try {
      await axios.post("https://api-start-pira.vercel.app/api/register", { username, password, name });
      setMessage("Usuário registrado com sucesso!");
      setMessageType("success");
      setShowMessage(true);
    } catch (error) {
      console.error("Erro ao registrar usuário:", error); // Adicione este console.error para verificar o erro
      setMessage("Erro ao registrar usuário.");
      setMessageType("error");
      setShowMessage(true);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
    if (messageType === "success") {
      navigate("/acessos");
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <h3>Registrar</h3>
        <div className="input-field">
          <label>Nome Completo</label>
          <input type="text" className="form-control" placeholder="Digite seu nome completo" required onChange={(e) => setName(e.target.value)} />
          <FaUser className="icon" />
        </div>
        <div className="input-field">
          <label>Email</label>
          <input type="email" className="form-control" placeholder="Digite email" required onChange={(e) => setUsername(e.target.value)} />
          <FaUser className="icon" />
        </div>
        <div className="input-field">
          <label>Senha</label>
          <input type="password" className="form-control" placeholder="Digite a senha" required onChange={(e) => setPassword(e.target.value)} onBlur={validatePasswords} />
          <FaLock className="icon" />
        </div>
        <div className="input-field">
          <input type="password" className="form-control" placeholder="Confirme a senha" required onChange={(e) => setPasswordConfirm(e.target.value)} onBlur={validatePasswords} />
          <FaLock className="iconn" />
          {passwordError && <span className="error-message">{passwordError}</span>}
        </div>
        <button type="submit" className="btn-primary-btn-block" disabled={passwordError}>
          Registrar
        </button>
      </form>
      {showMessage && <Message message={message} type={messageType} onClose={handleCloseMessage} />}
      <div className="create-account text-right">
        <p>
          Já tem uma conta?{" "}
          <a href="#" onClick={() => navigate("/")}>
            Faça login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
