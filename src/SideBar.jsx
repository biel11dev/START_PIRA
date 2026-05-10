import React from "react";
import { FaBox, FaCashRegister, FaClock, FaCogs, FaMoneyBillWave, FaShoppingCart, FaUserFriends, FaUserTie, FaUserCircle, FaClipboardList } from "react-icons/fa"; // Importar ícones
import { Link } from "react-router-dom";
import "./SideBar.css";

const Sidebar = ({ permissions = {} }) => {
  const modules = [
    { name: "Caixa", path: "/cash-register", key: "caixa", icon: <FaCashRegister className="icon" /> },
    { name: "PDV", path: "/pdv", key: "pdv", icon: <FaShoppingCart className="icon" /> },
    { name: "Lista de compras", path: "/products", key: "produtos", icon: <FaBox className="icon" /> },
    { name: "Estoque", path: "/base-produto", key: "base_produto", icon: <FaBox className="icon" /> },
    { name: "Máquinas", path: "/machines", key: "maquinas", icon: <FaCogs className="icon" /> },
    { name: "Fiado", path: "/fiado", key: "fiado", icon: <FaUserTie className="icon" /> },
    { name: "Despesas", path: "/despesas", key: "despesas", icon: <FaMoneyBillWave className="icon" /> },
    { name: "Ponto", path: "/ponto", key: "ponto", icon: <FaClock className="icon" /> },
    { name: "Acessos", path: "/acessos", key: "acessos", icon: <FaUserFriends className="icon" /> },
    { name: "Pessoal", path: "/pessoal", key: "pessoal", icon: <FaUserCircle className="icon" /> },
    { name: "Auditoria", path: "/auditoria", key: "auditoria", icon: <FaClipboardList className="icon" /> },
  ];

  const handleRedirect = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="sidebar">
      <div className="sidebar-indicator" onClick={handleRedirect}>
        ☰
      </div>
      <div className="sidebar-content">
        <h3>Módulos</h3>
        <ul className="sidebar-menu">
          {modules.map(
            (module) =>
              permissions[module.key] && ( // Verifica se o usuário tem permissão para o módulo
                <li key={module.key}>
                  <Link to={module.path}>
                    {module.icon}
                    <span className="link-text">{module.name}</span>
                  </Link>
                </li>
              )
          )}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
