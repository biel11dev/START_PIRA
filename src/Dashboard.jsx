import React from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = ({ permissions = {} }) => {
  const navigate = useNavigate();

  const modules = [
    { name: "CAIXA", path: "/cash-register", key: "caixa" },
    { name: "LISTA DE COMPRAS", path: "/products", key: "produtos" },
    { name: "MÁQUINAS", path: "/machines", key: "maquinas" },
    { name: "FIADO", path: "/fiado", key: "fiado" },
    { name: "DESPESAS", path: "/despesas", key: "despesas" },
    { name: "PONTO", path: "/ponto", key: "ponto" },
    { name: "ACESSOS", path: "/acessos", key: "acessos" },
    { name: "ESTOQUE", path: "/base-produto", key: "base_produto" },
    { name: "PDV", path: "/pdv", key: "pdv" },
    { name: "PESSOAL", path: "/pessoal", key: "pessoal" },
    { name: "AUDITORIA", path: "/auditoria", key: "auditoria" },
  ];

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="modules">
        {modules.map(
          (module) =>
            permissions[module.key] && (
              <div key={module.key} className="module" onClick={() => navigate(module.path)}>
                {module.name}
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default Dashboard;
