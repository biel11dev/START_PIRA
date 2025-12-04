import axios from "axios";
import { useEffect, useState } from "react";
import Message from "./Message";
import "./Ponto.css";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Ponto = () => {
  const [employees, setEmployees] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedTab, setSelectedTab] = useState("daily");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null); // Novo estado para funcionário selecionado
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newFuncao, setNewFuncao] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedWeekRange, setSelectedWeekRange] = useState(null);
  const [tempValues, setTempValues] = useState({});
  const [showFaltaModal, setShowFaltaModal] = useState(false);
  const [showFaltaManualModal, setShowFaltaManualModal] = useState(false);
  const [faltaEmployee, setFaltaEmployee] = useState(null);
  const [faltaEmployeeManual, setFaltaEmployeeManual] = useState(null);
  const [faltaPoint, setFaltaPoint] = useState(null);
  const [faltaPointManual, setFaltaPointManual] = useState(null);
  const [faltaHoras, setFaltaHoras] = useState(1);
  const [faltaHorasManual, setFaltaHorasManual] = useState(1);
  
  // Estados para modal de detalhes do funcionário
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState(null);
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [editEmployeeValues, setEditEmployeeValues] = useState({});
  
  // Estados para histórico de holerites
  const [payslipHistory, setPayslipHistory] = useState([]);

  // Carregar histórico de holerites do localStorage
  useEffect(() => {
    const storedHistory = localStorage.getItem('payslipHistory');
    if (storedHistory) {
      setPayslipHistory(JSON.parse(storedHistory));
    }
  }, []);

  // Função para abrir detalhes do funcionário
  const openEmployeeDetails = (employee) => {
    setSelectedEmployeeForDetails(employee);
    setEditEmployeeValues({
      contato: employee.contato || "",
      dataEntrada: employee.dataEntrada ? employee.dataEntrada.split('T')[0] : "",
      ativo: employee.ativo !== false
    });
    setIsEditingInModal(false);
    setShowEmployeeDetails(true);
    
    // Carregar histórico específico do funcionário
    const storedHistory = localStorage.getItem('payslipHistory');
    if (storedHistory) {
      const allHistory = JSON.parse(storedHistory);
      const employeeHistory = allHistory.filter(item => item.employeeId === employee.id);
      setPayslipHistory(employeeHistory);
    }
  };

  // Função para salvar alterações no modal
  const handleSaveEmployeeDetails = async () => {
    try {
      const updatedData = {
        ...selectedEmployeeForDetails,
        contato: editEmployeeValues.contato,
        dataEntrada: editEmployeeValues.dataEntrada,
        ativo: editEmployeeValues.ativo
      };

      await handleUpdateEmployee(selectedEmployeeForDetails.id, updatedData);
      
      // Atualizar o funcionário selecionado no modal
      setSelectedEmployeeForDetails(updatedData);
      setIsEditingInModal(false);
      
      setMessage({ show: true, text: "Dados atualizados com sucesso!", type: "success" });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setMessage({ show: true, text: "Erro ao salvar alterações", type: "error" });
    }
  };

  const fetchEmployees = async (date) => {
    setLoading(true);
    try {
      const employeesResponse = await axios.get("https://api-start-pira.vercel.app/api/employees");
      const employeesData = employeesResponse.data;

      // Se não há funcionário selecionado, seleciona o primeiro
      if (!selectedEmployeeId && employeesData.length > 0) {
        setSelectedEmployeeId(employeesData[0].id);
      }

      const dailyPointsResponse = await axios.get("https://api-start-pira.vercel.app/api/daily-points");
      const dailyPointsData = dailyPointsResponse.data;

      const filteredDate = date || new Date().toISOString().split("T")[0];

      const updatedEmployees = employeesData.map((employee) => {
        const dailyPoint = dailyPointsData.find(
          (point) => point.employeeId === employee.id && point.date.startsWith(filteredDate)
        );

        const entry = dailyPoint?.entry ? dailyPoint.entry.split("T")[1].slice(0, 5) : "";
        const exit = dailyPoint?.exit ? dailyPoint.exit.split("T")[1].slice(0, 5) : "";

        return {
          ...employee,
          entry,
          exit,
          gateOpen: dailyPoint?.gateOpen ? dailyPoint.gateOpen.split("T")[1].slice(0, 5) : "",
          workedHours: calculateWorkedHours(entry, exit),
          extraOrMissingHours: calculateExtraOrMissingHours(entry, exit, 8),
          valorHora: employee.valorHora || 0,
          falta: dailyPoint?.falta || false,
        };
      });

      setEmployees(updatedEmployees);
    } catch (error) {
      console.error("Erro ao buscar funcionários ou pontos diários:", error);
      setMessage("Erro ao carregar dados.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Função para salvar no histórico (holerites e recibos)
  const savePayslipToHistory = (employeeId, employeeName, referenceMonth, filePath = null, type = 'holerite') => {
    const newRecord = {
      id: Date.now(),
      employeeId,
      employeeName,
      referenceMonth, // formato: "2025-11" ou "Novembro/2025"
      generatedAt: new Date().toISOString(),
      generatedAtFormatted: new Date().toLocaleString('pt-BR'),
      filePath, // para referência futura se necessário
      type // 'holerite' ou 'recibo'
    };
    
    const storedHistory = localStorage.getItem('payslipHistory');
    const allHistory = storedHistory ? JSON.parse(storedHistory) : [];
    const updatedHistory = [newRecord, ...allHistory]; // Novos no topo
    
    localStorage.setItem('payslipHistory', JSON.stringify(updatedHistory));
    setPayslipHistory(updatedHistory.filter(item => item.employeeId === employeeId));
    
    return newRecord;
  };

  const generateReceipt = async () => {
    if (!selectedEmployeeId) {
      setMessage({ show: true, text: "Selecione um funcionário primeiro!", type: "error" });
      return;
    }

    try {
      // Capturar a tabela diretamente da tela
      const table = document.querySelector('.ponto-table');
      if (!table) {
        setMessage({ show: true, text: "Tabela não encontrada!", type: "error" });
        return;
      }

      const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
      if (!selectedEmployee) {
        setMessage({ show: true, text: "Funcionário não encontrado!", type: "error" });
        return;
      }

      // Usar html2canvas para capturar a tabela
      const canvas = await html2canvas(table, {
        scale: 2, // Melhor qualidade
        backgroundColor: '#000000',
        logging: false
      });

      // Converter para JPEG e baixar
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const dateStr = selectedDate;
        const fileName = `recibo_${selectedEmployee.name.replace(/\s+/g, '_')}_${dateStr}.jpeg`;
        
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Salvar no histórico
        let referenceMonth = '';
        if (selectedTab === 'daily') {
          const date = parseISODate(selectedDate);
          referenceMonth = `${date.toLocaleDateString('pt-BR', { month: 'long' })}/${date.getFullYear()}`;
        } else if (selectedTab === 'weekly') {
          const date = parseISODate(selectedDate);
          referenceMonth = `${date.toLocaleDateString('pt-BR', { month: 'long' })}/${date.getFullYear()}`;
        } else if (selectedTab === 'monthly') {
          const date = parseISODate(selectedDate);
          referenceMonth = `${date.toLocaleDateString('pt-BR', { month: 'long' })}/${date.getFullYear()}`;
        }
        
        savePayslipToHistory(
          selectedEmployee.id,
          selectedEmployee.name,
          referenceMonth,
          fileName,
          'recibo'
        );
        
        setMessage({ show: true, text: "Recibo gerado com sucesso!", type: "success" });
      }, 'image/jpeg', 0.95);
      
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      setMessage({ show: true, text: "Erro ao gerar recibo!", type: "error" });
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const generatePayslipJPG = async () => {
    if (!selectedEmployeeId) {
      setMessage({ show: true, text: "Selecione um funcionário primeiro!", type: "error" });
      return;
    }

    try {
      // Criar um canvas temporário para gerar a imagem
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Definir dimensões do canvas (A4 proporções em alta resolução)
      canvas.width = 1240;  // A4 width em pixels (150 DPI para melhor qualidade)
      canvas.height = 1754; // A4 height em pixels (150 DPI)
      
      // Fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Adicionar marca d'água com a imagem
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      // Função para desenhar a marca d'água
      const drawWatermark = () => {
        ctx.save();
        ctx.globalAlpha = 0.1; // Transparência de 10%
        
        // Calcular tamanho e posição da marca d'água
        const watermarkSize = Math.min(canvas.width, canvas.height) * 0.4;
        const x = (canvas.width - watermarkSize) / 2;
        const y = (canvas.height - watermarkSize) / 2;
        
        ctx.drawImage(logoImg, x, y, watermarkSize, watermarkSize);
        ctx.restore();
      };

      // Tentar carregar a imagem da marca d'água
      logoImg.onload = drawWatermark;
      logoImg.onerror = () => {
        // Se não conseguir carregar a imagem, desenha uma marca d'água de texto
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#1976d2';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('START PIRA', canvas.width/2, canvas.height/2);
        ctx.restore();
      };
      
      // Usar a imagem da marca d'água que já existe na pasta public
      logoImg.src = '/marcadagua.png';
      
      // Desenhar a marca d'água imediatamente (caso a imagem já esteja em cache)
      setTimeout(drawWatermark, 100);

      // Buscar dados do funcionário selecionado
      const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
      if (!selectedEmployee) {
        setMessage({ show: true, text: "Funcionário não encontrado!", type: "error" });
        return;
      }

      // Cabeçalho com bordas
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, canvas.width - 60, 120);
      
      // Título da empresa
      ctx.fillStyle = '#1976d2';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('START PIRA', canvas.width/2, 80);
      
      ctx.fillStyle = '#333333';
      ctx.font = '18px Arial';
      ctx.fillText('Sistema de Controle de Ponto', canvas.width/2, 110);

      // Título do documento
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 28px Arial';
      let title = '';
      if (selectedTab === 'daily') title = 'HOLERITE DIÁRIO';
      else if (selectedTab === 'weekly') title = 'RELATÓRIO SEMANAL';
      else if (selectedTab === 'monthly') title = 'RELATÓRIO MENSAL';
      
      ctx.fillText(title, canvas.width/2, 200);

      // Seção de informações do funcionário
      let yPos = 280;
      ctx.fillStyle = '#1976d2';
      ctx.fillRect(60, yPos - 25, canvas.width - 120, 35);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('DADOS DO FUNCIONÁRIO', 80, yPos);
      
      yPos += 60;
      ctx.fillStyle = '#000000';
      ctx.font = '18px Arial';
      
      // Dados em duas colunas
      ctx.fillText(`Funcionário: ${selectedEmployee.name}`, 80, yPos);
      
      // Formatar período baseado no tipo de visualização
      let periodoTexto = '';
      if (selectedTab === 'daily') {
        periodoTexto = `Data: ${formatDateWithWeekday(selectedDate)}`;
      } else if (selectedTab === 'weekly') {
        const { startDate, endDate } = getWeekRange(selectedDate);
        const startFormatted = formatDateWithWeekday(startDate.toISOString().split('T')[0]);
        const endFormatted = formatDateWithWeekday(endDate.toISOString().split('T')[0]);
        periodoTexto = `Período: ${startFormatted} | ${endFormatted}`;
      } else if (selectedTab === 'monthly') {
        const currentDate = parseISODate(selectedDate);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startFormatted = formatDateWithWeekday(firstDay.toISOString().split('T')[0]);
        const endFormatted = formatDateWithWeekday(lastDay.toISOString().split('T')[0]);
        periodoTexto = `Período: ${startFormatted} | ${endFormatted}`;
      }
      
      ctx.fillText(periodoTexto, 650, yPos);
      
      yPos += 35;
      ctx.fillText(`Função: ${selectedEmployee.position || 'N/A'}`, 80, yPos);
      
      yPos += 35;
      ctx.fillText(`Valor/Hora: R$ ${parseFloat(selectedEmployee.valorHora || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 80, yPos);
      
      yPos += 35;
      ctx.fillText(`Meta Semanal: ${selectedEmployee.metaHoras || 'N/A'}h`, 80, yPos);
      ctx.fillText(`Bonificação Semanal: R$ ${parseFloat(selectedEmployee.bonificacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 650, yPos);

      // Seção de dados do ponto
      yPos += 80;
      ctx.fillStyle = '#1976d2';
      ctx.fillRect(60, yPos - 25, canvas.width - 120, 35);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('REGISTRO DE PONTO', 80, yPos);

      yPos += 60;
      ctx.fillStyle = '#000000';
      ctx.font = '18px Arial';

      if (selectedTab === 'daily') {
        // Dados do ponto diário em formato de tabela
        const workedHours = calculateWorkedHours(selectedEmployee.entry, selectedEmployee.exit);
        const extraHours = calculateExtraOrMissingHours(selectedEmployee.entry, selectedEmployee.exit, selectedEmployee.carga);
        
        // Desenhar bordas da tabela
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        
        // Cabeçalho da tabela
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(80, yPos - 20, 500, 30);
        ctx.strokeRect(80, yPos - 20, 500, 30);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Entrada', 100, yPos);
        ctx.fillText('Saída', 200, yPos);
        ctx.fillText('Horas Trab.', 300, yPos);
        ctx.fillText('Extras/Faltantes', 450, yPos);
        
        yPos += 40;
        
        // Dados da tabela
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(80, yPos - 20, 500, 30);
        ctx.strokeRect(80, yPos - 20, 500, 30);
        
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText(selectedEmployee.entry || '--:--', 100, yPos);
        ctx.fillText(selectedEmployee.exit || '--:--', 200, yPos);
        ctx.fillText(workedHours, 300, yPos);
        
        // Colorir horas extras/faltantes
        if (extraHours.startsWith('+')) {
          ctx.fillStyle = '#4caf50';
        } else if (extraHours.startsWith('-')) {
          ctx.fillStyle = '#f44336';
        }
        ctx.fillText(extraHours, 450, yPos);
        ctx.fillStyle = '#000000';
        
        yPos += 80;
        
        // Calcular valor do dia
        const horasNumero = parseFloat(workedHours.replace('h', '.').replace('m', '')) || 0;
        const valorDia = horasNumero * (parseFloat(selectedEmployee.valorHora) || 0);
        
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#1976d2';
        ctx.fillText(`Valor Total do Dia: R$ ${valorDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 80, yPos);
        
      } else if (selectedTab === 'weekly') {
        // Para visualização semanal - mostrar dados da semana
        const weekPoints = weeklyData.find(emp => emp.id === selectedEmployee.id)?.points || [];
        
        if (weekPoints.length > 0) {
          // Cabeçalho da tabela semanal
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          
          const tableWidth = canvas.width - 160; // Largura mais ampla para alinhar com a seção colorida
          
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(80, yPos - 20, tableWidth, 30);
          ctx.strokeRect(80, yPos - 20, tableWidth, 30);
          
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('Data', 120, yPos);
          ctx.fillText('Entrada', 350, yPos);
          ctx.fillText('Saída', 500, yPos);
          ctx.fillText('Horas Trabalhadas', 650, yPos);
          ctx.fillText('Valor do Dia', 900, yPos);
          
          yPos += 40;
          
          let totalValorSemana = 0;
          let totalHorasSemana = 0;
          
          // Dados de cada dia da semana
          weekPoints.forEach(point => {
            const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
            const exit = point.exit ? point.exit.split("T")[1].slice(0, 5) : "";
            const workedHours = calculateWorkedHours(entry, exit);
            const valorDia = calculateDailyValue(entry, exit, selectedEmployee.valorHora);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(80, yPos - 20, tableWidth, 25);
            ctx.strokeRect(80, yPos - 20, tableWidth, 25);
            
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText(formatDateWithWeekday(point.date), 120, yPos);
            ctx.fillText(entry || '--:--', 350, yPos);
            ctx.fillText(exit || '--:--', 500, yPos);
            ctx.fillText(workedHours, 650, yPos);
            ctx.fillText(`R$ ${valorDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 900, yPos);
            
            totalValorSemana += valorDia;
            const match = workedHours.match(/(\d+)h\s+(\d+)m/);
            if (match) {
              totalHorasSemana += parseInt(match[1]) + (parseInt(match[2]) / 60);
            }
            
            yPos += 25;
          });
          
          // Resumo semanal
          yPos += 20;
          ctx.fillStyle = '#1976d2';
          ctx.font = 'bold 16px Arial';
          
          const weeklyCalc = calculateWeeklyValue(selectedEmployee, weekPoints);
          const valorTotalComBonus = weeklyCalc.valorBase + weeklyCalc.bonificacao;
          
          ctx.fillText(`Total da Semana: R$ ${valorTotalComBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 80, yPos);
          
          if (weeklyCalc.temBonificacao) {
            yPos += 25;
            ctx.fillStyle = '#4caf50';
            ctx.fillText(`🏆 Bonificação: R$ ${weeklyCalc.bonificacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 80, yPos);
          }
        } else {
          ctx.fillText('Nenhum dado encontrado para esta semana', 80, yPos);
        }
        
      } else {
        // Para visualização mensal - mostrar dados completos do mês
        const monthPoints = monthlyData.find(emp => emp.id === selectedEmployee.id)?.points || [];
        
        if (monthPoints.length > 0) {
          // Agrupar pontos por semana para mostrar bonificações
          const weeklyGroups = {};
          monthPoints.forEach(point => {
            const date = parseISODate(point.date);
            const weekKey = getWeekKey(date);
            if (!weeklyGroups[weekKey]) {
              weeklyGroups[weekKey] = [];
            }
            weeklyGroups[weekKey].push(point);
          });

          // Cabeçalho da tabela mensal resumida
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          
          const tableWidthMonthly = canvas.width - 160; // Mesma largura ampla
          
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(80, yPos - 20, tableWidthMonthly, 30);
          ctx.strokeRect(80, yPos - 20, tableWidthMonthly, 30);
          
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('Semana', 150, yPos);
          ctx.fillText('Dias Trabalhados', 300, yPos);
          ctx.fillText('Total de Horas', 500, yPos);
          ctx.fillText('Valor Base', 700, yPos);
          ctx.fillText('Bonificação', 900, yPos);
          
          yPos += 40;
          
          let totalValorMes = 0;
          let totalBonificacoes = 0;
          let semanaIndex = 1;
          
          // Dados de cada semana do mês
          Object.entries(weeklyGroups).forEach(([weekKey, weekPoints]) => {
            const weekCalc = calculateWeeklyValue(selectedEmployee, weekPoints);
            const valorSemana = weekCalc.valorBase + weekCalc.bonificacao;
            
            // Calcular total de horas da semana
            const totalHorasSemana = weekPoints.reduce((acc, point) => {
              const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
              const exit = point.exit ? point.exit.split("T")[1].slice(0, 5) : "";
              const workedHours = calculateWorkedHours(entry, exit);
              const match = workedHours.match(/(\d+)h\s+(\d+)m/);
              if (match) {
                return acc + parseInt(match[1]) + (parseInt(match[2]) / 60);
              }
              return acc;
            }, 0);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(80, yPos - 20, tableWidthMonthly, 25);
            ctx.strokeRect(80, yPos - 20, tableWidthMonthly, 25);
            
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText(`Semana ${semanaIndex}`, 150, yPos);
            ctx.fillText(`${weekPoints.length}`, 300, yPos);
            ctx.fillText(`${totalHorasSemana.toFixed(1)}h`, 500, yPos);
            ctx.fillText(`R$ ${weekCalc.valorBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 700, yPos);
            
            if (weekCalc.temBonificacao) {
              ctx.fillStyle = '#4caf50';
              ctx.fillText(`R$ ${weekCalc.bonificacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 900, yPos);
              totalBonificacoes += weekCalc.bonificacao;
            } else {
              ctx.fillStyle = '#666666';
              ctx.fillText('--', 900, yPos);
            }
            
            totalValorMes += valorSemana;
            semanaIndex++;
            yPos += 25;
          });
          
          // Resumo mensal
          yPos += 20;
          ctx.fillStyle = '#1976d2';
          ctx.fillRect(80, yPos - 20, tableWidthMonthly, 35);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Arial';
          ctx.fillText('RESUMO DO MÊS', 100, yPos);
          
          yPos += 40;
          ctx.fillStyle = '#1976d2';
          ctx.font = 'bold 18px Arial';
          ctx.fillText(`Total de Dias Trabalhados: ${monthPoints.length}`, 80, yPos);
          
          yPos += 30;
          ctx.fillText(`Valor Base do Mês: R$ ${(totalValorMes - totalBonificacoes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 80, yPos);
          
          if (totalBonificacoes > 0) {
            yPos += 30;
            ctx.fillStyle = '#4caf50';
            ctx.fillText(`Total de Bonificações: R$ ${totalBonificacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 80, yPos);
          }
          
          yPos += 40;
          ctx.fillStyle = '#d32f2f';
          ctx.font = 'bold 22px Arial';
          ctx.fillText(`VALOR TOTAL DO MÊS: R$ ${totalValorMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 80, yPos);
          
          // Estatísticas adicionais
          yPos += 50;
          ctx.fillStyle = '#666666';
          ctx.font = '14px Arial';
          
          const totalHorasMes = monthPoints.reduce((acc, point) => {
            const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
            const exit = point.exit ? point.exit.split("T")[1].slice(0, 5) : "";
            const workedHours = calculateWorkedHours(entry, exit);
            const match = workedHours.match(/(\d+)h\s+(\d+)m/);
            if (match) {
              return acc + parseInt(match[1]) + (parseInt(match[2]) / 60);
            }
            return acc;
          }, 0);
          
          const semanasComBonus = Object.values(weeklyGroups).filter(weekPoints => {
            const weekCalc = calculateWeeklyValue(selectedEmployee, weekPoints);
            return weekCalc.temBonificacao;
          }).length;
          
          ctx.fillText(`Total de Horas Trabalhadas: ${totalHorasMes.toFixed(1)}h`, 80, yPos);
          yPos += 20;
          ctx.fillText(`Semanas com Bonificação: ${semanasComBonus} de ${Object.keys(weeklyGroups).length}`, 80, yPos);
          yPos += 20;
          ctx.fillText(`Média de Horas por Dia: ${(totalHorasMes / monthPoints.length).toFixed(1)}h`, 80, yPos);
          
        } else {
          ctx.fillText('Nenhum dado encontrado para este mês', 80, yPos);
        }
      }

      // Rodapé profissional com assinaturas
      yPos = canvas.height - 200;
      
      // Linha separadora
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, yPos);
      ctx.lineTo(canvas.width - 60, yPos);
      ctx.stroke();
      
      yPos += 40;
      
      // Assinaturas
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      
      // Espaços para assinaturas
      const signatureWidth = 300;
      const leftSignatureX = 200;
      const rightSignatureX = canvas.width - 200;
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      
      // Linha da assinatura do funcionário
      ctx.beginPath();
      ctx.moveTo(leftSignatureX - signatureWidth/2, yPos + 40);
      ctx.lineTo(leftSignatureX + signatureWidth/2, yPos + 40);
      ctx.stroke();
      
      // Linha da assinatura do responsável
      ctx.beginPath();
      ctx.moveTo(rightSignatureX - signatureWidth/2, yPos + 40);
      ctx.lineTo(rightSignatureX + signatureWidth/2, yPos + 40);
      ctx.stroke();
      
      yPos += 60;
      ctx.fillText('Assinatura do Funcionário', leftSignatureX, yPos);
      ctx.fillText('Assinatura do Responsável', rightSignatureX, yPos);
      
      yPos += 50;
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, canvas.width/2, yPos);
      
      yPos += 25;
      ctx.fillText('START PIRA - Sistema de Controle de Ponto', canvas.width/2, yPos);

      // Função para finalizar e baixar o arquivo
      const finalizarEBaixar = () => {
        // Aguarda um pouco para garantir que a marca d'água foi desenhada
        setTimeout(() => {
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            let filePrefix = '';
            let referenceMonth = '';
            
            if (selectedTab === 'daily') {
              filePrefix = 'holerite_diario';
              const date = new Date(selectedDate);
              referenceMonth = `${date.toLocaleDateString('pt-BR', { month: 'long' })}/${date.getFullYear()}`;
            } else if (selectedTab === 'weekly') {
              filePrefix = 'relatorio_semanal';
              const date = new Date(selectedDate);
              referenceMonth = `${date.toLocaleDateString('pt-BR', { month: 'long' })}/${date.getFullYear()}`;
            } else if (selectedTab === 'monthly') {
              filePrefix = 'relatorio_mensal';
              const date = new Date(selectedDate);
              referenceMonth = `${date.toLocaleDateString('pt-BR', { month: 'long' })}/${date.getFullYear()}`;
            }
            
            const dateStr = selectedDate; // selectedDate já é uma string no formato YYYY-MM-DD
            const fileName = `${filePrefix}_${selectedEmployee.name.replace(/\s+/g, '_')}_${dateStr}.jpeg`;
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Salvar no histórico
            savePayslipToHistory(
              selectedEmployee.id,
              selectedEmployee.name,
              referenceMonth,
              fileName
            );
            
            setMessage({ show: true, text: "Holerite JPEG gerado com sucesso!", type: "success" });
          }, 'image/jpeg', 0.9);
        }, 500); // Aguarda 500ms para garantir que tudo foi desenhado
      };

      // Chamar a finalização
      finalizarEBaixar();
      
    } catch (error) {
      console.error('Erro ao gerar holerite JPEG:', error);
      setMessage({ show: true, text: "Erro ao gerar holerite JPEG!", type: "error" });
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const getWeekRange = (date) => {
    const currentDate = typeof date === 'string' ? parseISODate(date) : date;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const dayOfWeek = currentDate.getDay();
    const startOffset = dayOfWeek === 0 ? -6 : 2 - dayOfWeek;
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() + startOffset);

    // Garantir que o início da semana não seja antes do primeiro dia do mês
    if (startDate < firstDayOfMonth) {
      startDate.setTime(firstDayOfMonth.getTime());
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 5);
    
    // Garantir que o fim da semana não ultrapasse o último dia do mês
    if (endDate > lastDayOfMonth) {
      endDate.setTime(lastDayOfMonth.getTime());
    }

    return { startDate, endDate };
  };

  const fetchWeeklyData = async (dateRef, customRange = null) => {
    setLoading(true);
    const referenceDate = dateRef || new Date().toISOString().split('T')[0];
    
    let startDate, endDate;
    if (customRange) {
      startDate = customRange.startDate;
      endDate = customRange.endDate;
    } else if (selectedWeekRange) {
      startDate = selectedWeekRange.startDate;
      endDate = selectedWeekRange.endDate;
    } else {
      const range = getWeekRange(referenceDate);
      startDate = range.startDate;
      endDate = range.endDate;
    }
    
    const pad = (n) => n.toString().padStart(2, "0");
    const startDateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
    const endDateStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

    try {
      const employeesResponse = await axios.get("https://api-start-pira.vercel.app/api/employees");
      const dailyPointsResponse = await axios.get(`https://api-start-pira.vercel.app/api/daily-points?startDate=${startDateStr}&endDate=${endDateStr}`);

      const dailyPointsData = dailyPointsResponse.data;

      const updatedWeeklyData = employeesResponse.data.map((employee) => {
        const points = dailyPointsData.filter((point) => {
          const pointDate = point.date.split("T")[0];
          return point.employeeId === employee.id && pointDate >= startDateStr && pointDate <= endDateStr;
        });
        return {
          ...employee,
          points,
        };
      });

      setWeeklyData(updatedWeeklyData);
    } catch (error) {
      console.error("Erro ao buscar dados semanais:", error);
      setMessage("Erro ao carregar dados semanais.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async (dateRef) => {
    setLoading(true);
    const referenceDate = dateRef || new Date().toISOString().split('T')[0];
    const currentMonth = referenceDate.slice(0, 7);
    try {
      const employeesResponse = await axios.get("https://api-start-pira.vercel.app/api/employees");
      const dailyPointsResponse = await axios.get(`https://api-start-pira.vercel.app/api/daily-points?month=${currentMonth}`);

      const dailyPointsData = dailyPointsResponse.data;

      const updatedMonthlyData = employeesResponse.data.map((employee) => {
        const points = dailyPointsData.filter((point) => point.employeeId === employee.id && point.date.startsWith(currentMonth));

        const totalExtraOrMissingHours = points.reduce((total, point) => {
          const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
          const exit = point.exit ? point.exit.split("T")[1].slice(0, 5) : "";
          const extraOrMissing = calculateExtraOrMissingHours(entry, exit, employee.carga || 8);
          const [hours, minutes] = extraOrMissing
            .replace(/[^\d\-+]/g, "")
            .split("h")
            .map(Number);
          return total + (hours * 60 + (minutes || 0)) * (extraOrMissing.startsWith("-") ? -1 : 1);
        }, 0);

        return {
          ...employee,
          points,
          totalExtraOrMissingHours,
        };
      });

      setMonthlyData(updatedMonthlyData);
    } catch (error) {
      console.error("Erro ao buscar dados mensais:", error);
      setMessage("Erro ao carregar dados mensais.");
    } finally {
      setLoading(false);
    }
  };

  const [editValues, setEditValues] = useState({
  name: "",
  position: "",
  valorHora: "",
  metaHoras: "",
  bonificacao: "",
});

// Atualiza os campos quando o funcionário selecionado mudar
useEffect(() => {
  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
  setEditValues({
    name: selectedEmployee?.name || "",
    position: selectedEmployee?.position || "",
    valorHora: selectedEmployee?.valorHora 
      ? parseFloat(selectedEmployee.valorHora).toFixed(2).replace('.', ',') 
      : "",
    metaHoras: selectedEmployee?.metaHoras || "",
    bonificacao: selectedEmployee?.bonificacao || "",
  });
}, [selectedEmployeeId, employees]);

const handleEditChange = (field, value) => {
  setEditValues(prev => ({ ...prev, [field]: value }));
};

const handleSaveEdit = () => {
  if (!selectedEmployeeId) return;
  handleUpdateEmployee(selectedEmployeeId, {
    name: editValues.name,
    position: editValues.position,
    valorHora: parseFloat(editValues.valorHora.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
    metaHoras: parseFloat(editValues.metaHoras) || 0,
    bonificacao: parseFloat(editValues.bonificacao) || 0,
  });
};

  useEffect(() => {
    if (selectedTab === "weekly") {
      fetchWeeklyData(selectedDate);
    } else if (selectedTab === "monthly") {
      fetchMonthlyData(selectedDate);
    } else {
      fetchEmployees(selectedDate);
    }
  }, [selectedTab, selectedDate]);

  const handleRegisterTime = async (id) => {
    try {
      const updatedData = tempValues[id];
      if (!updatedData) return;

      const currentDate = selectedDate;

      const dailyPointsResponse = await axios.get(`https://api-start-pira.vercel.app/api/daily-points/${id}?date=${currentDate}`);

      const dailyPoints = dailyPointsResponse.data;
      const dailyPoint = Array.isArray(dailyPoints) ? dailyPoints[0] : dailyPoints;

      const dataToUpdate = {
        ...updatedData,
        date: currentDate,
        employeeId: id,
      };

      if (dailyPoint && dailyPoint.id) {
        await axios.put(`https://api-start-pira.vercel.app/api/daily-points/${dailyPoint.id}`, dataToUpdate);
      } else {
        await axios.post(`https://api-start-pira.vercel.app/api/daily-points`, dataToUpdate);
      }

      setEmployees((prev) =>
        prev.map((employee) => {
          if (employee.id === id) {
            const updatedEntry = updatedData.entry || employee.entry;
            const updatedExit = updatedData.exit || employee.exit;
            const updatedGateOpen = updatedData.gateOpen || employee.gateOpen;

            return {
              ...employee,
              entry: updatedEntry,
              exit: updatedExit,
              gateOpen: updatedGateOpen,
              workedHours: calculateWorkedHours(updatedEntry, updatedExit),
              extraOrMissingHours: calculateExtraOrMissingHours(updatedEntry, updatedExit, employee.carga),
            };
          }
          return employee;
        })
      );

      setTempValues((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      setMessage({ show: true, text: "Registro de ponto atualizado com sucesso!", type: "success" });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Erro ao atualizar horários:", error);
      setMessage({ show: true, text: "Falha ao atualizar registro de ponto!", type: "error" });
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handlePreviousDay = () => {
    const newDate = parseISODate(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  const handlePreviousMonth = () => {
    const newDate = parseISODate(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const newDate = parseISODate(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  const handleNextMonth = () => {
    const newDate = parseISODate(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  const handleAddEmployee = async () => {
    if (newEmployeeName.trim() === "") return;
    try {
      const newEmployee = {
        name: newEmployeeName,
        position: newFuncao,
        entry: "",
        exit: "",
        gateOpen: "",
        dailyHours: 8,
      };

      const response = await axios.post("https://api-start-pira.vercel.app/api/employees", newEmployee);

      setEmployees([...employees, response.data]);
      setNewEmployeeName("");
      setNewFuncao("");
      
      // Se é o primeiro funcionário, seleciona automaticamente
      if (employees.length === 0) {
        setSelectedEmployeeId(response.data.id);
      }
      
      setMessage({ show: true, text: "Funcionário adicionado com sucesso", type: "success" });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Erro ao adicionar funcionário:", error);
      setMessage("Erro ao adicionar funcionário.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleRemoveEmployee = async (id) => {
    setMessage({
      text: "Você tem certeza que deseja excluir este funcionário? Todos os registros de ponto também serão excluídos.",
      type: "confirm",
      onConfirm: async () => {
        try {
          await axios.delete(`https://api-start-pira.vercel.app/api/daily-points?employeeId=${id}`);
          await axios.delete(`https://api-start-pira.vercel.app/api/employees/${id}`);

          setEmployees((prevEmployees) => prevEmployees.filter((employee) => employee.id !== id));
          
          // Se o funcionário removido era o selecionado, seleciona outro
          if (selectedEmployeeId === id) {
            const remainingEmployees = employees.filter(emp => emp.id !== id);
            if (remainingEmployees.length > 0) {
              setSelectedEmployeeId(remainingEmployees[0].id);
            } else {
              setSelectedEmployeeId(null);
            }
          }
          
          setMessage({ text: "Funcionário removido com sucesso!", type: "success" });
          setTimeout(() => setMessage(""), 3000);
        } catch (error) {
          console.error("Erro ao remover funcionário:", error);
          setMessage({ text: "Erro ao remover funcionário.", type: "error" });
          setTimeout(() => setMessage(""), 3000);
        }
      },
      onClose: () => setMessage(null),
    });
  };

  const handleDeleteDailyPoint = async (employeeId, date) => {
    try {
      const currentDate = new Date(date);
      const response = await axios.get(`https://api-start-pira.vercel.app/api/daily-points/${employeeId}?employeeId=${employeeId}&date=${currentDate.toISOString().split("T")[0]}`);
      const dailyPoints = response.data;
      const dailyPoint = Array.isArray(dailyPoints) ? dailyPoints[0] : dailyPoints;

      if (dailyPoint && dailyPoint.id) {
        await axios.delete(`https://api-start-pira.vercel.app/api/daily-points/${dailyPoint.id}`);
        setMessage({ text: "Registro de ponto removido com sucesso!", type: "success" });
        if (selectedTab === "weekly") {
          fetchWeeklyData();
        } else if (selectedTab === "monthly") {
          fetchMonthlyData();
        } else {
          fetchEmployees(selectedDate);
        }
      } else {
        setMessage({ text: "Registro de ponto não encontrado.", type: "error" });
      }
    } catch (error) {
      console.error("Erro ao remover registro de ponto:", error);
      console.error("Dados enviados:", { employeeId, date });
      setMessage({ text: "Erro ao remover registro de ponto.", type: "error" });
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleUpdateEmployee = async (id, updatedData) => {
    try {
      await axios.put(`https://api-start-pira.vercel.app/api/employees/${id}`, updatedData);

      setEmployees((prev) => prev.map((employee) => (employee.id === id ? { ...employee, ...updatedData } : employee)));
      
      
      setMessage({ show: true, text: "Dados atualizados com sucesso!", type: "success" });
    } catch (error) {
      console.error("Erro ao atualizar funcionário:", error);
      console.error("Dados enviados:", updatedData);
      setMessage("Erro ao atualizar funcionário.");
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const calculateWorkedHours = (entry, exit) => {
    if (!entry || !exit) return "0h 0m";

    const entryTime = new Date(`1970-01-01T${entry}:00`);
    let exitTime = new Date(`1970-01-01T${exit}:00`);

    if (exitTime < entryTime) {
      exitTime.setDate(exitTime.getDate() + 1);
    }

    const diffMs = exitTime - entryTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours}h ${diffMinutes}m`;
  };

  // Função para calcular valor total diário (valor hora * horas trabalhadas)
  const calculateDailyValue = (entry, exit, valorHora) => {
    if (!entry || !exit || !valorHora) return 0;

    const workedHoursString = calculateWorkedHours(entry, exit);
    const match = workedHoursString.match(/(\d+)h\s+(\d+)m/);
    
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const totalHours = hours + (minutes / 60);
    
    return totalHours * parseFloat(valorHora);
  };

  // Função para calcular valor total mensal (valor diário + bonificações semanais)
  const calculateMonthlyValue = (employee, points) => {
    if (!points || points.length === 0) return 0;

    // Agrupar pontos por semana (excluindo segundas-feiras)
    const weeklyGroups = {};
    points.forEach(point => {
      const date = parseISODate(point.date);
      const weekKey = getWeekKey(date);
      if (weekKey !== null) { // Ignorar segundas-feiras (weekKey === null)
        if (!weeklyGroups[weekKey]) {
          weeklyGroups[weekKey] = [];
        }
        weeklyGroups[weekKey].push(point);
      }
    });

    let valorTotal = 0;
    let bonificacaoTotal = 0;

    // Calcular valor base e bonificação para cada semana
    Object.values(weeklyGroups).forEach(weekPoints => {
      const weekCalc = calculateWeeklyValue(employee, weekPoints);
      valorTotal += weekCalc.valorBase;
      bonificacaoTotal += weekCalc.bonificacao;
    });
    
    return valorTotal + bonificacaoTotal;
  };

  // Função auxiliar para criar chave da semana baseada em terça-domingo
  const getWeekKey = (date) => {
    const currentDate = new Date(date);
    const dayOfWeek = currentDate.getDay(); // 0=domingo, 1=segunda, 2=terça...
    
    // Segunda-feira não pertence a nenhuma semana
    if (dayOfWeek === 1) {
      return null;
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Encontrar a primeira terça-feira do mês
    let firstTuesday = new Date(firstDayOfMonth);
    while (firstTuesday.getDay() !== 2 && firstTuesday <= lastDayOfMonth) {
      firstTuesday.setDate(firstTuesday.getDate() + 1);
    }
    
    // Se a data é antes da primeira terça-feira, pertence à semana parcial inicial
    if (currentDate < firstTuesday) {
      return `${year}-${month + 1}-parcial`;
    }
    
    // Encontrar a terça-feira da semana atual
    let tuesdayOfWeek = new Date(currentDate);
    
    if (dayOfWeek === 0) { // Domingo
      // Voltar 5 dias para achar a terça-feira
      tuesdayOfWeek.setDate(tuesdayOfWeek.getDate() - 5);
    } else if (dayOfWeek >= 2) { // Terça a sábado
      // Voltar até terça-feira
      tuesdayOfWeek.setDate(tuesdayOfWeek.getDate() - (dayOfWeek - 2));
    }
    
    // Garantir que a terça-feira encontrada está no mesmo mês
    if (tuesdayOfWeek < firstDayOfMonth) {
      return `${year}-${month + 1}-parcial`;
    }
    
    // Usar a data da terça-feira como chave (formato: YYYY-MM-DD)
    const key = `${tuesdayOfWeek.getFullYear()}-${String(tuesdayOfWeek.getMonth() + 1).padStart(2, '0')}-${String(tuesdayOfWeek.getDate()).padStart(2, '0')}`;
    return key;
  };

  // Função para calcular valor semanal (valor diário + bonificação se meta atingida)
  const calculateWeeklyValue = (employee, weekPoints) => {
    if (!weekPoints || weekPoints.length === 0) return { valorBase: 0, bonificacao: 0, temBonificacao: false };

    // Calcular total de horas trabalhadas na semana
    const weekWorkedMin = weekPoints.reduce((acc, point) => {
      const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
      const exit = point.exit ? point.exit.split("T")[1].slice(0, 5) : "";
      const match = calculateWorkedHours(entry, exit).match(/(\d+)h\s+(\d+)m/);
      const h = match ? parseInt(match[1], 10) : 0;
      const m = match ? parseInt(match[2], 10) : 0;
      return acc + (h * 60 + m);
    }, 0);

    const weekWorkedHours = weekWorkedMin / 60;
    const valorBase = weekWorkedHours * (parseFloat(employee.valorHora) || 0);
    
    // Verificar bonificação semanal
    const metaHoras = parseFloat(employee.metaHoras) || 0;
    const bonificacao = parseFloat(employee.bonificacao) || 0;
    const temBonificacao = metaHoras > 0 && weekWorkedHours >= metaHoras && bonificacao > 0;
    
    return {
      valorBase,
      bonificacao: temBonificacao ? bonificacao : 0,
      temBonificacao,
      totalHoras: weekWorkedHours
    };
  };

  const calculateExtraOrMissingHours = (entry, exit, carga) => {
    if (!entry || !exit) return "0h 0m";

    const entryTime = new Date(`1970-01-01T${entry}:00`);
    let exitTime = new Date(`1970-01-01T${exit}:00`);

    if (exitTime < entryTime) {
      exitTime.setDate(exitTime.getDate() + 1);
    }

    const diffMs = exitTime - entryTime;
    const workedHours = diffMs / (1000 * 60 * 60);
    const extraOrMissing = workedHours - carga;

    const absHours = Math.floor(Math.abs(extraOrMissing));
    const absMinutes = Math.floor((Math.abs(extraOrMissing) % 1) * 60);

    return extraOrMissing > 0 ? `+${absHours}h ${absMinutes}m` : `-${absHours}h ${absMinutes}m`;
  };

  const calculateGateOpenTime = (entry, gateOpen) => {
    if (!entry || !gateOpen || gateOpen === "--:--" || gateOpen === "00:00") return "";

    const entryTime = new Date(`1970-01-01T${entry}:00`);
    let gateOpenTime = new Date(`1970-01-01T${gateOpen}:00`);

    if (gateOpenTime < entryTime) {
      gateOpenTime.setDate(gateOpenTime.getDate() + 1);
    }

    const diffMs = gateOpenTime - entryTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return `${diffMinutes}m`;
  };

  function formatDateWithWeekday(dateString) {
    const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    const d = parseISODate(dateString);
    const dia = d.getDate().toString().padStart(2, "0");
    const mes = (d.getMonth() + 1).toString().padStart(2, "0");
    const ano = d.getFullYear().toString().slice(-2);
    const semana = dias[d.getDay()];
    return `${dia}/${mes}/${ano} - ${semana}`;
  }

  const parseISODate = (isoString) => {
    const [year, month, day] = isoString.split("T")[0].split("-");
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  const parseHourStringToMinutes = (str) => {
    if (!str) return 0;
    const match = str.match(/([+-]?)(\d+)h\s*(\d+)m/);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    return sign * (hours * 60 + minutes);
  };

  const handleOpenFaltaModal = (employee, point) => {
    setFaltaEmployee(employee);
    setFaltaPoint(point);
    setFaltaHoras(1);
    setShowFaltaModal(true);
  };

  const handleOpenFaltaManualModal = (employee, point) => {
    setFaltaEmployeeManual(employee);
    setFaltaPointManual(point);
    setFaltaHorasManual(1);
    setShowFaltaManualModal(true);
  };

  const handleCloseFaltaModal = () => {
    setShowFaltaModal(false);
    setFaltaEmployee(null);
    setFaltaPoint(null);
    setFaltaHoras(1);
  };

  const handleCloseFaltaManualModal = () => {
    setShowFaltaManualModal(false);
    setFaltaEmployeeManual(null);
    setFaltaPointManual(null);
    setFaltaHorasManual(1);
  };

  const getDailyPointForEmployee = (employeeId, date) => {
    const dateWithTime = `${date} 00:00:00`;
    return axios.get(`https://api-start-pira.vercel.app/api/daily-points/${employeeId}?date=${encodeURIComponent(dateWithTime)}`).then((res) => {
      const dailyPoints = res.data;
      return Array.isArray(dailyPoints) ? dailyPoints[0] : dailyPoints;
    });
  };

  const handleConfirmFalta = async (tipo) => {
    if (!faltaEmployee || !faltaPoint) return;
    try {
      let entry = faltaPoint.entry ? faltaPoint.entry.split("T")[1].slice(0, 5) : "08:00";
      let exit = faltaPoint.exit ? faltaPoint.exit.split("T")[1].slice(0, 5) : "17:00";

      if (tipo === "removerHoras") {
        const entryDate = new Date(`1970-01-01T${entry}:00`);
        let exitDate = new Date(`1970-01-01T${exit}:00`);
        exitDate.setHours(exitDate.getHours() - faltaHoras);
        exit = exitDate.toTimeString().slice(0, 5);
      }

      const dataToUpdate = {
        entry,
        exit,
        date: faltaPoint.date,
        employeeId: faltaEmployee.id,
      };

      if (faltaPoint && faltaPoint.id && tipo === "falta") {
        await axios.put(`https://api-start-pira.vercel.app/api/daily-points/falta/${faltaEmployee.id}`, dataToUpdate);
      } else {
        await axios.put(`https://api-start-pira.vercel.app/api/daily-points/${faltaEmployee.id}`, dataToUpdate);
      }

      setShowFaltaModal(false);
      setFaltaEmployee(null);
      setFaltaPoint(null);
      setFaltaHoras(1);
      setMessage({ show: true, text: "Falta/ajuste registrado com sucesso!", type: "success" });
      fetchWeeklyData(selectedDate);
    } catch (error) {
      setMessage({ show: true, text: "Erro ao registrar falta/ajuste!", type: "error" });
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleConfirmFaltaManual = async (tipo) => {
    if (!faltaEmployeeManual || !faltaPointManual) return;
    try {
      let entry = faltaPointManual.entry ? faltaPointManual.entry.split("T")[1].slice(0, 5) : "08:00";
      let exit = faltaPointManual.exit ? faltaPointManual.exit.split("T")[1].slice(0, 5) : "17:00";

      if (tipo === "removerHoras") {
        const entryDate = new Date(`1970-01-01T${entry}:00`);
        let exitDate = new Date(`1970-01-01T${exit}:00`);
        exitDate.setHours(exitDate.getHours() - faltaHoras);
        exit = exitDate.toTimeString().slice(0, 5);
      }

      const dataToUpdate = {
        entry,
        exit,
        date: faltaPointManual.date,
        employeeId: faltaEmployeeManual.id,
      };

      if (faltaPointManual && tipo === "falta") {
        await axios.put(`https://api-start-pira.vercel.app/api/daily-points/falta-manual/${faltaEmployeeManual.id}`, dataToUpdate);
      } else {
        await axios.put(`https://api-start-pira.vercel.app/api/daily-points/${faltaEmployeeManual.id}`, dataToUpdate);
      }

      setShowFaltaManualModal(false);
      setFaltaEmployeeManual(null);
      setFaltaPointManual(null);
      setFaltaHorasManual(1);
      setMessage({ show: true, text: "Falta/ajuste registrado com sucesso!", type: "success" });
      fetchEmployees(selectedDate);
    } catch (error) {
      setMessage({ show: true, text: "Erro ao registrar falta/ajuste!", type: "error" });
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Filtrar dados baseado no funcionário selecionado
  const getFilteredData = () => {
    if (!selectedEmployeeId) return [];
    
    if (selectedTab === "daily") {
      return employees.filter(emp => emp.id === selectedEmployeeId);
    } else if (selectedTab === "weekly") {
      return weeklyData.filter(emp => emp.id === selectedEmployeeId);
    } else if (selectedTab === "monthly") {
      return monthlyData.filter(emp => emp.id === selectedEmployeeId);
    }
    return [];
  };

  const filteredData = getFilteredData();

  return (
    <div className="ponto-container">
      <h2 className="nome-ponto">Gerenciamento de Ponto</h2>
      {loading && <div className="loading">Carregando...</div>}
      {message && <Message message={message.text} type={message.type} onClose={message.onClose} onConfirm={message.onConfirm} />}

      {/* Seletor de funcionário */}
      <div className="employee-selector" style={{ margin: "20px 0", padding: "15px", background: "#f5f5f5", borderRadius: "8px" }}>
        <label style={{ marginRight: "10px", fontWeight: "bold", textShadow: "none" }}>Selecionar Colaborador:</label>
        <select 
          value={selectedEmployeeId || ""} 
          onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
          style={{ padding: "8px", marginRight: "15px", borderRadius: "4px", border: "1px solid #ccc", textShadow: "none" }}
        >
          <option value="">Selecione um colaborador</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name} - {emp.position || 'N/A'}</option>
          ))}
        </select>
        
        {/* Botão para gerar JPEG */}
        <button 
          onClick={generatePayslipJPG}
          style={{ 
            padding: "8px 15px", 
            background: "#d32f2f", 
            color: "white", 
            border: "none", 
            borderRadius: "4px", 
            cursor: "pointer",
            marginLeft: "10px"
          }}
          disabled={!selectedEmployeeId}
        >
          📄 Gerar Holerite
        </button>
        
        {/* Botão para gerar Recibo */}
        <button 
          onClick={generateReceipt}
          style={{ 
            padding: "8px 15px", 
            background: "#1976d2", 
            color: "white", 
            border: "none", 
            borderRadius: "4px", 
            cursor: "pointer",
            marginLeft: "10px"
          }}
          disabled={!selectedEmployeeId}
        >
          🧾 Gerar Recibo
        </button>
      </div>

      <div className="date-selector">
        <button onClick={handlePreviousMonth}>&lt;&lt; Mês</button>
        <button onClick={handlePreviousDay}>&lt; Dia</button>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        <button onClick={handleNextDay}>&gt; Dia</button>
        <button onClick={handleNextMonth}>&gt;&gt; Mês</button>
      </div>

      <div className="tabs">
        <button onClick={() => setSelectedTab("daily")} className={selectedTab === "daily" ? "active" : ""}>
          Visualização Diária
        </button>
        <button onClick={() => setSelectedTab("weekly")} className={selectedTab === "weekly" ? "active" : ""}>
          Visualização Semanal
        </button>
        <button onClick={() => setSelectedTab("monthly")} className={selectedTab === "monthly" ? "active" : ""}>
          Visualização Mensal
        </button>
      </div>
      
    {selectedTab === "weekly" && (
  <div className="week-tabs" style={{ margin: "16px 0", display: "flex", gap: 8 }}>
    {(() => {
      const date = parseISODate(selectedDate);
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const weeks = [];
      
      // Encontrar a primeira terça-feira do mês (dia 2)
      let firstTuesday = new Date(firstDay);
      while (firstTuesday.getDay() !== 2 && firstTuesday <= lastDay) {
        firstTuesday.setDate(firstTuesday.getDate() + 1);
      }
      
      // Se existem dias úteis antes da primeira terça-feira, criar semana parcial
      if (firstTuesday > firstDay && firstTuesday <= lastDay) {
        // Encontrar o último dia útil (não segunda-feira) antes da terça
        let lastWorkDay = null;
        let checkDate = new Date(firstDay);
        const dayBeforeTuesday = new Date(firstTuesday);
        dayBeforeTuesday.setDate(dayBeforeTuesday.getDate() - 1);
        
        while (checkDate <= dayBeforeTuesday) {
          const dayOfWeek = checkDate.getDay();
          // Dias úteis: terça(2) a domingo(0), exceto segunda(1)
          if (dayOfWeek !== 1) {
            lastWorkDay = new Date(checkDate);
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        // Criar semana parcial apenas se houver dias úteis
        if (lastWorkDay) {
          weeks.push({ 
            start: new Date(firstDay), 
            end: lastWorkDay 
          });
        }
      }
      
      // Criar semanas completas (terça a domingo) a partir da primeira terça-feira
      let current = new Date(firstTuesday);
      if (current <= lastDay) {
        while (current <= lastDay) {
          const start = new Date(current);
          const end = new Date(start);
          end.setDate(start.getDate() + 5); // Terça + 5 dias = domingo
          
          // Garantir que o fim da semana não ultrapasse o último dia do mês
          if (end > lastDay) {
            end.setTime(lastDay.getTime());
          }
          
          weeks.push({ start: new Date(start), end: new Date(end) });
          current.setDate(current.getDate() + 7);
        }
      }
      
      // Se não criou nenhuma semana (mês só tem segundas-feiras), criar semana com todo o mês
      if (weeks.length === 0) {
        weeks.push({ start: new Date(firstDay), end: new Date(lastDay) });
      }

      return weeks.map((week, idx) => {
        const label = `${week.start.toLocaleDateString("pt-BR")} - ${week.end.toLocaleDateString("pt-BR")}`;
        const selected = parseISODate(selectedDate);
        selected.setHours(0, 0, 0, 0);
        const isActive = selected >= week.start && selected <= week.end;
        return (
          <button
            key={idx}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "none",
              background: isActive 
                ? "linear-gradient(135deg, #0d29a5 0%, #330363 100%)" 
                : "#007bff",
              color: "#fff",
              fontWeight: isActive ? "bold" : "normal",
              cursor: "pointer",
              opacity: 1,
              outline: isActive ? "2px solid #fff" : "none",
              transition: "all 0.3s ease",
            }}
            onClick={() => {
              setSelectedDate(week.start.toISOString().split("T")[0]);
              setSelectedWeekRange({ startDate: week.start, endDate: week.end });
              fetchWeeklyData(week.start.toISOString().split("T")[0], { startDate: week.start, endDate: week.end });
            }}
          >
            {label}
          </button>
        );
      });
    })()}
  </div>
)}

      <div className="add-employee">
        <input type="text" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} placeholder="Nome do Colaborador" />
        <input type="text" value={newFuncao} onChange={(e) => setNewFuncao(e.target.value)} placeholder="Função" />
        <button onClick={handleAddEmployee}>Adicionar Colaborador</button>
      </div>

{selectedEmployeeId && (() => {
  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
  if (!selectedEmployee) return null;
  return (
    <div
      style={{
        margin: "30px auto 20px auto",
        maxWidth: 500,
        background: "#f8f8f8",
        borderRadius: 10,
        boxShadow: "0 2px 8px #0001",
        padding: 24,
        textAlign: "center"
      }}
    >
      <h3 style={{ marginBottom: 16, textShadow: "none" }}>Gerenciamento do Colaborador</h3>
      <div style={{ marginBottom: 12  }}>
        <label style={{ fontWeight: "bold", textShadow: "none" }}>Nome:</label>
        <input
          style={{ marginLeft: 8, padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 200, textShadow: "none" }}
          type="text"
          value={editValues.name}
          onChange={e => handleEditChange("name", e.target.value)}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: "bold", textShadow: "none" }}>Função:</label>
        <input
          style={{ marginLeft: 8, padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 200, textShadow: "none" }}
          type="text"
          value={editValues.position}
          onChange={e => handleEditChange("position", e.target.value)}
        />
      </div>
      <div style={{ marginBottom: 12, textShadow: "none" }}>
        <label style={{ fontWeight: "bold", textShadow: "none" }}>Valor/Hora:</label>
        <input
          style={{ marginLeft: 8, padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 150, textShadow: "none" }}
          type="text"
          placeholder="Ex: 15,50"
          value={editValues.valorHora ? `R$ ${editValues.valorHora}` : ""}
          onChange={e => {
            // Remove "R$" e espaços, permite apenas números, vírgula e ponto
            const value = e.target.value.replace(/[^\d,\.]/g, '');
            handleEditChange("valorHora", value);
          }}
        /> 
      </div>
      <div style={{ marginBottom: 12, textShadow: "none" }}>
        <label style={{ fontWeight: "bold", textShadow: "none" }}>Meta de horas (semana):</label>
        <input
          style={{ marginLeft: 8, padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 120, textShadow: "none" }}
          type="number"
          step="0.5"
          min="0"
          placeholder="40"
          value={editValues.metaHoras || ""}
          onChange={e => handleEditChange("metaHoras", e.target.value)}
        /> 
      </div>
      <div style={{ marginBottom: 12, textShadow: "none" }}>
        <label style={{ fontWeight: "bold", textShadow: "none" }}>Bonificação semanal:</label>
        <input
          style={{ marginLeft: 8, padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 120, textShadow: "none" }}
          type="number"
          step="0.01"
          min="0"
          placeholder="R$ 0,00"
          value={editValues.bonificacao || ""}
          onChange={e => handleEditChange("bonificacao", e.target.value)}
        /> 
      </div>
      <div>
        <button
          style={{
            background: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "8px 18px",
            marginRight: 12,
            cursor: "pointer"
          }}
          onClick={() => handleRemoveEmployee(selectedEmployee.id)}
        >
          Excluir Colaborador
        </button>
        <button
          style={{
            background: "#4caf50",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "8px 18px",
            marginRight: 12,
            cursor: "pointer"
          }}
          onClick={handleSaveEdit}
        >
          Salvar alterações
        </button>
        <button
          style={{
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "8px 18px",
            cursor: "pointer",
            marginTop: 8,
            width: "100%"
          }}
          onClick={() => openEmployeeDetails(selectedEmployee)}
        >
          📋 Ver Detalhes Completos
        </button>
      </div>
    </div>
  );
  })()}

      <table className="ponto-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Colaborador</th>
            <th>Função</th>
            <th>Entrada</th>
            <th>Saída</th>
            {/* <th>Portão Aberto</th> */}
            <th>Horas Trabalhadas</th>
            <th>Horas x Valor</th>
            {/* <th>Horas Extras/Faltantes</th> */}
            {/* <th>Tempo para Abrir Portão</th> */}
            {selectedTab === "daily" && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {selectedTab === "daily" &&
            filteredData.map((employee) => (
              <tr key={employee.id} className={employee.falta ? "linha-falta" : ""}>
                <td className="td-funcionario">{formatDateWithWeekday(selectedDate)}</td>
                <td 
                  className="td-funcionario" 
                >
                  {employee.name}
                </td>
                <td className="td-funcionario">{employee.position || "N/A"}</td>
                <td>
                  <input
                    className="input-funcionario"
                    type="time"
                    value={tempValues[employee.id]?.entry || employee.entry}
                    onChange={(e) =>
                      setTempValues((prev) => ({
                        ...prev,
                        [employee.id]: { ...prev[employee.id], entry: e.target.value },
                      }))
                    }
                  />
                </td>
                <td>
                  <input
                    className="input-funcionario"
                    type="time"
                    value={tempValues[employee.id]?.exit || employee.exit}
                    onChange={(e) =>
                      setTempValues((prev) => ({
                        ...prev,
                        [employee.id]: { ...prev[employee.id], exit: e.target.value },
                      }))
                    }
                  />
                </td>
                {/* <td>
                  <input
                    className="input-funcionario"
                    type="time"
                    value={tempValues[employee.id]?.gateOpen || employee.gateOpen}
                    onChange={(e) =>
                      setTempValues((prev) => ({
                        ...prev,
                        [employee.id]: { ...prev[employee.id], gateOpen: e.target.value },
                      }))
                    }
                  />
                </td> */}
                <td className="td-funcionario">{calculateWorkedHours(employee.entry, employee.exit)}</td>
                <td className="td-funcionario">
                  R$ {calculateDailyValue(
                    tempValues[employee.id]?.entry || employee.entry,
                    tempValues[employee.id]?.exit || employee.exit,
                    employee.valorHora
                  ).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </td>
                {/* <td className="td-funcionario">{calculateExtraOrMissingHours(employee.entry, employee.exit, employee.carga)}</td> */}
                {/* <td className="td-funcionario">{calculateGateOpenTime(employee.entry, employee.gateOpen)}</td> */}
                <td>
                   <button className="td-funcionario-atz" onClick={() => handleRegisterTime(employee.id)}>
                    Atualizar
                  </button> 
                   <button className="td-funcionario" onClick={() => handleDeleteDailyPoint(employee.id, selectedDate)}>
                    Excluir
                  </button> 
                   {/* <button
                    className="td-funcionario"
                    style={{ background: "#d40000", color: "#fff", marginLeft: 4, marginTop: 9 }}
                    onClick={async () => {
                      const point = await getDailyPointForEmployee(employee.id, selectedDate);
                      handleOpenFaltaManualModal(employee, point || { date: selectedDate, entry: employee.entry, exit: employee.exit });
                    }}
                  >
                    Falta
                  </button>  */}
                </td>
              </tr>
            ))}
          {selectedTab === "weekly" &&
            filteredData.flatMap((employee) => {
              const pointsSorted = [...employee.points].sort((a, b) => new Date(a.date) - new Date(b.date));

              const totalCarga = pointsSorted.reduce((acc) => acc + (employee.carga || 8), 0);
              const totalWorked = pointsSorted.reduce((acc, point) => {
                const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
                const exit = point.exit ? point.exit.split("T")[1].slice(0, 5) : "";
                const match = calculateWorkedHours(entry, exit).match(/(\d+)h\s+(\d+)m/);
                const h = match ? parseInt(match[1], 10) : 0;
                const m = match ? parseInt(match[2], 10) : 0;
                return acc + (h * 60 + m);
              }, 0);
              const totalExtras = pointsSorted.reduce((acc, point) => {
                const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
                const exit = point.exit ? point.exit.split("T")[1].slice(0, 5) : "";
                const str = calculateExtraOrMissingHours(entry, exit, employee.carga);
                return acc + parseHourStringToMinutes(str);
              }, 0);
              const totalGate = pointsSorted.reduce((acc, point) => {
                const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
                const gate = point.gateOpen ? point.gateOpen.split("T")[1].slice(0, 5) : "";
                const min = Number(calculateGateOpenTime(entry, gate).replace("m", "")) || 0;
                return acc + min;
              }, 0);

              const formatHM = (min) => `${Math.floor(Math.abs(min) / 60)}h ${Math.abs(min) % 60}m`;
              const formatExtra = (min) => (min === 0 ? "0h 0m" : (min > 0 ? "+" : "-") + formatHM(min));

              return [
                ...pointsSorted.map((point) => (
                  <tr key={employee.id + point.date} className={point.falta ? "linha-falta" : ""}>
                    <td className="td-funcionario">{formatDateWithWeekday(point.date)}</td>
                    <td 
                      className="td-funcionario" 
                    >
                      {employee.name}
                    </td>
                    <td className="td-funcionario">{employee.position || "N/A"}</td>
                    <td>
                      <input
                        className="input-funcionario"
                        type="time"
                        value={tempValues[employee.id]?.entry || (point.entry ? point.entry.split("T")[1].slice(0, 5) : "")}
                        onChange={(e) =>
                          setTempValues((prev) => ({
                            ...prev,
                            [employee.id]: { ...prev[employee.id], entry: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input-funcionario"
                        type="time"
                        value={tempValues[employee.id]?.exit || (point.exit ? point.exit.split("T")[1].slice(0, 5) : "")}
                        onChange={(e) =>
                          setTempValues((prev) => ({
                            ...prev,
                            [employee.id]: { ...prev[employee.id], exit: e.target.value },
                          }))
                        }
                      />
                    </td>
                    {/* <td>
                      <input
                        className="input-funcionario"
                        type="time"
                        value={tempValues[employee.id]?.gateOpen || (point.gateOpen ? point.gateOpen.split("T")[1].slice(0, 5) : "")}
                        onChange={(e) =>
                          setTempValues((prev) => ({
                            ...prev,
                            [employee.id]: { ...prev[employee.id], gateOpen: e.target.value },
                          }))
                        }
                      />
                    </td> */}
                     <td className="td-funcionario">
                      {calculateWorkedHours(point.entry ? point.entry.split("T")[1].slice(0, 5) : "", point.exit ? point.exit.split("T")[1].slice(0, 5) : "")}
                    </td>
                    <td className="td-funcionario">
                      R$ {calculateDailyValue(
                        point.entry ? point.entry.split("T")[1].slice(0, 5) : "",
                        point.exit ? point.exit.split("T")[1].slice(0, 5) : "",
                        employee.valorHora
                      ).toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </td>

                    {/* <td className="td-funcionario">
                      {calculateExtraOrMissingHours(
                        point.entry ? point.entry.split("T")[1].slice(0, 5) : "",
                        point.exit ? point.exit.split("T")[1].slice(0, 5) : "",
                        employee.carga
                      )}
                    </td> */}
                    {/* <td className="td-funcionario">
                      {calculateGateOpenTime(point.entry ? point.entry.split("T")[1].slice(0, 5) : "", point.gateOpen ? point.gateOpen.split("T")[1].slice(0, 5) : "")}
                    </td> */}
                    {/* <td>
                      <button className="td-funcionario" style={{ background: "#d40000", color: "#fff", marginLeft: 4 }} onClick={() => handleOpenFaltaModal(employee, point)}>
                        Falta
                      </button>
                    </td> */}
                  </tr>
                )),
                <tr key={employee.id + "-resumo"}>
                  <td colSpan={5} style={{ textAlign: "center", fontWeight: "bold", background: "black", color: "#fff" }}>
                    Resumo horas:
                  </td>
                  <td style={{ fontWeight: "bold", background: "black", color: "#fff" }}>{formatHM(totalWorked)}</td>
                  <td style={{ fontWeight: "bold", background: "black", color: "#fff", minWidth: "80px" }}>
                    {(() => {
                      const weeklyCalc = calculateWeeklyValue(employee, pointsSorted);
                      const valorTotal = weeklyCalc.valorBase + weeklyCalc.bonificacao;
                      return (
                        <>
                          R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {weeklyCalc.temBonificacao && (
                            <div style={{ fontSize: '12px', color: '#4caf50' }}>
                              🏆 1 Bonificação Semanal!
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  {/* <td style={{ fontWeight: "bold", background: "black", color: "#fff" }}>{totalCarga}h</td> */}
                  {/* <td style={{ fontWeight: "bold", background: "black", color: "#fff" }}>{formatExtra(totalExtras)}</td> */}
                  {/* <td style={{ fontWeight: "bold", background: "black", color: "#fff" }}>{totalGate}m</td> */}
                  {/* <td style={{ background: "black" }}></td> */}
                </tr>,
              ];
            })}
          {selectedTab === "monthly" &&
            filteredData.flatMap((employee) => {
              const pointsSorted = (employee.points || []).sort((a, b) => new Date(a.date) - new Date(b.date));

              const totalCargaMin = pointsSorted.reduce((acc) => acc + (employee.carga || 8) * 60, 0);
              const totalWorkedMin = pointsSorted.reduce((acc, point) => {
                const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
                const exit = point.exit ? point.exit.split("T")[1].slice(0, 5) : "";
                const match = calculateWorkedHours(entry, exit).match(/(\d+)h\s+(\d+)m/);
                const h = match ? parseInt(match[1], 10) : 0;
                const m = match ? parseInt(match[2], 10) : 0;
                return acc + (h * 60 + m);
              }, 0);
              const totalExtras = totalWorkedMin - totalCargaMin;
              const totalCarga = totalCargaMin / 60;
              const totalWorked = totalWorkedMin;
              const totalGate = pointsSorted.reduce((acc, point) => {
                const entry = point.entry ? point.entry.split("T")[1].slice(0, 5) : "";
                const gate = point.gateOpen ? point.gateOpen.split("T")[1].slice(0, 5) : "";
                const min = Number(calculateGateOpenTime(entry, gate).replace("m", "")) || 0;
                return acc + min;
              }, 0);

              const formatHM = (min) => `${Math.floor(Math.abs(min) / 60)}h ${Math.abs(min) % 60}m`;
              const formatExtra = (min) => (min === 0 ? "0h 0m" : (min > 0 ? "+" : "-") + formatHM(min));
              return [
                ...pointsSorted.map((point) => (
                  <tr key={employee.id + point.date} className={point.falta ? "linha-falta" : ""}>
                    <td className="td-funcionario">{formatDateWithWeekday(point.date)}</td>
                    <td className="td-funcionario">{employee.name}</td>
                    <td className="td-funcionario">{employee.position || "N/A"}</td>
                    <td>
                      <input
                        className="input-funcionario"
                        type="time"
                        value={tempValues[employee.id]?.entry || (point.entry ? point.entry.split("T")[1].slice(0, 5) : "")}
                        onChange={(e) =>
                          setTempValues((prev) => ({
                            ...prev,
                            [employee.id]: { ...prev[employee.id], entry: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input-funcionario"
                        type="time"
                        value={tempValues[employee.id]?.exit || (point.exit ? point.exit.split("T")[1].slice(0, 5) : "")}
                        onChange={(e) =>
                          setTempValues((prev) => ({
                            ...prev,
                            [employee.id]: { ...prev[employee.id], exit: e.target.value },
                          }))
                        }
                      />
                    </td>
                    {/* <td>
                                <input
                                className="input-funcionario"
                                type="time"
                                value={tempValues[employee.id]?.gateOpen || (point.gateOpen ? point.gateOpen.split("T")[1].slice(0, 5) : "")}
                                onChange={(e) =>
                                  setTempValues((prev) => ({
                                  ...prev,
                                  [employee.id]: { ...prev[employee.id], gateOpen: e.target.value },
                                  }))
                                }
                                />
                              </td> */}
                               <td className="td-funcionario">
                                {calculateWorkedHours(point.entry ? point.entry.split("T")[1].slice(0, 5) : "", point.exit ? point.exit.split("T")[1].slice(0, 5) : "")}
                              </td>
                              <td className="td-funcionario">
                                R$ {calculateDailyValue(
                                  point.entry ? point.entry.split("T")[1].slice(0, 5) : "",
                                  point.exit ? point.exit.split("T")[1].slice(0, 5) : "",
                                  employee.valorHora
                                ).toLocaleString('pt-BR', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </td>

                              {/* <td className="td-funcionario">
                                {calculateExtraOrMissingHours(
                                point.entry ? point.entry.split("T")[1].slice(0, 5) : "",
                                point.exit ? point.exit.split("T")[1].slice(0, 5) : "",
                                employee.carga
                                )}
                              </td> */}
                    {/* <td className="td-funcionario">
                      {calculateGateOpenTime(point.entry ? point.entry.split("T")[1].slice(0, 5) : "", point.gateOpen ? point.gateOpen.split("T")[1].slice(0, 5) : "")}
                    </td> */}
                    {/* <td>
                      <button className="td-funcionario" onClick={() => handleOpenFaltaModal(employee, point)}>
                        Falta
                      </button>
                    </td> */}
                  </tr>
                )),
                <tr key={employee.id + "-resumo"}>
                  <td colSpan={5} style={{ textAlign: "center", fontWeight: "bold", background: "black", color: "#fff" }}>
                    Resumo horas:
                  </td>
                  <td style={{ fontWeight: "bold", background: "black", color: "#fff" }}>{formatHM(totalWorked)}</td>
                  <td style={{ fontWeight: "bold", background: "black", color: "#fff", minWidth: "80px" }}>
                    R$ {calculateMonthlyValue(employee, pointsSorted).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {/* Indica quantas bonificações semanais foram conquistadas */}
                    {(() => {
                      // Agrupar pontos por semana (excluindo segundas-feiras)
                      const weeklyGroups = {};
                      pointsSorted.forEach(point => {
                        const date = parseISODate(point.date);
                        const weekKey = getWeekKey(date);
                        if (weekKey !== null) { // Ignorar segundas-feiras (weekKey === null)
                          if (!weeklyGroups[weekKey]) {
                            weeklyGroups[weekKey] = [];
                          }
                          weeklyGroups[weekKey].push(point);
                        }
                      });

                      let bonificacoesConquistadas = 0;

                      // Verificar cada semana usando calculateWeeklyValue
                      Object.values(weeklyGroups).forEach(weekPoints => {
                        const weekCalc = calculateWeeklyValue(employee, weekPoints);
                        if (weekCalc.temBonificacao) {
                          bonificacoesConquistadas++;
                        }
                      });
                      
                      if (bonificacoesConquistadas > 0) {
                        return (
                          <div style={{ fontSize: '12px', color: '#4caf50' }}>
                            🏆 {bonificacoesConquistadas} Bonificação{bonificacoesConquistadas > 1 ? 's' : ''} Semanal{bonificacoesConquistadas > 1 ? 's' : ''}!
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  {/* <td style={{ fontWeight: "bold", background: "black", color: "#fff" }}>{formatExtra(totalExtras)}</td> */}
                  {/* <td style={{ fontWeight: "bold", background: "black", color: "#fff" }}>{totalGate}m</td> */}
                  {/* <td style={{ background: "black" }}></td> */}
                </tr>,
              ];
            })}
        </tbody>
      </table>
      
      {/* Modais de falta (mantidos inalterados) */}
      {showFaltaModal && (
        <div
          className="modal-falta"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "white",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Registrar Falta/Atraso</h3>
            <button
              style={{ background: "#d40000", color: "#fff", padding: "8px 16px", border: "none", borderRadius: 4, marginBottom: 12, width: "100%" }}
              onClick={() => handleConfirmFalta("falta")}
            >
              Marcar Falta (remover 8h)
            </button>
            <div style={{ margin: "16px 0" }}>
              <label className="label-falta" style={{ marginRight: 8 }}>
                Remover horas do ponto:
              </label>
              <input type="number" min={1} max={8} value={faltaHoras} onChange={(e) => setFaltaHoras(Number(e.target.value))} style={{ width: 60, marginRight: 8 }} />
              <button style={{ background: "#1976d2", color: "#fff", padding: "6px 12px", border: "none", borderRadius: 4 }} onClick={() => handleConfirmFalta("removerHoras")}>
                Remover Horas
              </button>
            </div>
            <button style={{ marginTop: 8, background: "#888", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px" }} onClick={handleCloseFaltaModal}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {showFaltaManualModal && (
        <div
          className="modal-falta"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "white",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Registrar Falta/Atraso</h3>
            <button
              style={{ background: "#d40000", color: "#fff", padding: "8px 16px", border: "none", borderRadius: 4, marginBottom: 12, width: "100%" }}
              onClick={() => handleConfirmFaltaManual("falta")}
            >
              Marcar Falta (remover 8h)
            </button>
            <div style={{ margin: "16px 0" }}>
              <label className="label-falta" style={{ marginRight: 8 }}>
                Remover horas do ponto:
              </label>
              <input type="number" min={1} max={8} value={faltaHorasManual} onChange={(e) => setFaltaHorasManual(Number(e.target.value))} style={{ width: 60, marginRight: 8 }} />
              <button
                style={{ background: "#1976d2", color: "#fff", padding: "6px 12px", border: "none", borderRadius: 4 }}
                onClick={() => handleConfirmFaltaManual("removerHoras")}
              >
                Remover Horas
              </button>
            </div>
            <button style={{ marginTop: 8, background: "#888", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px" }} onClick={handleCloseFaltaManualModal}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Funcionário */}
      {showEmployeeDetails && selectedEmployeeForDetails && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ 
            background: "#fff", 
            padding: 32, 
            borderRadius: 12, 
            minWidth: 400, 
            maxWidth: 600,
            maxHeight: "80vh",
            overflow: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, color: "#1976d2", textShadow: "none" }}>Detalhes do Funcionário</h2>
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                  textShadow: "none"
                }}
                onClick={() => setShowEmployeeDetails(false)}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: "#333", borderBottom: "2px solid #1976d2", paddingBottom: 8, textShadow: "none" }}>
                {selectedEmployeeForDetails.name}
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24, textShadow: "none"  }}>
              <div>
                <strong>Função:</strong>
                <p style={{ margin: "4px 0", color: "#666", textShadow: "none" }}>{selectedEmployeeForDetails.position || "N/A"}</p>
              </div>
              <div>
                <strong>Valor/Hora:</strong>
                <p style={{ margin: "4px 0", color: "#666", textShadow: "none" }}>
                  R$ {parseFloat(selectedEmployeeForDetails.valorHora || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <strong>Meta de Horas (semana):</strong>
                <p style={{ margin: "4px 0", color: "#666", textShadow: "none" }}>
                  {selectedEmployeeForDetails.metaHoras ? `${selectedEmployeeForDetails.metaHoras}h` : "N/A"}
                </p>
              </div>
              <div>
                <strong>Bonificação Semanal:</strong>
                <p style={{ margin: "4px 0", color: "#666", textShadow: "none" }}>
                  {selectedEmployeeForDetails.bonificacao 
                    ? `R$ ${parseFloat(selectedEmployeeForDetails.bonificacao).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "N/A"
                  }
                </p>
              </div>
              <div>
                <strong>Contato:</strong>
                {isEditingInModal ? (
                  <input
                    type="text"
                    style={{ 
                      margin: "4px 0", 
                      padding: "4px 8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      width: "100%",
                      textShadow: "none"
                    }}
                    value={editEmployeeValues.contato || ""}
                    onChange={(e) => setEditEmployeeValues(prev => ({...prev, contato: e.target.value}))}
                    placeholder="Digite o contato"
                  />
                ) : (
                  <p style={{ margin: "4px 0", color: "#666", textShadow: "none" }}>{selectedEmployeeForDetails.contato || "N/A"}</p>
                )}
              </div>
              <div>
                <strong>Data de Entrada:</strong>
                {isEditingInModal ? (
                  <input
                    type="date"
                    style={{ 
                      margin: "4px 0", 
                      padding: "4px 8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      width: "100%",
                      textShadow: "none"
                    }}
                    value={editEmployeeValues.dataEntrada || ""}
                    onChange={(e) => setEditEmployeeValues(prev => ({...prev, dataEntrada: e.target.value}))}
                  />
                ) : (
                  <p style={{ margin: "4px 0", color: "#666", textShadow: "none" }}>
                    {selectedEmployeeForDetails.dataEntrada 
                      ? new Date(selectedEmployeeForDetails.dataEntrada).toLocaleDateString("pt-BR")
                      : "N/A"
                    }
                  </p>
                )}
              </div>
              <div>
                <strong>Status:</strong>
                {isEditingInModal ? (
                  <select
                    style={{ 
                      margin: "4px 0", 
                      padding: "4px 8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      width: "100%",
                      textShadow: "none"
                    }}
                    value={editEmployeeValues.ativo ? "true" : "false"}
                    onChange={(e) => setEditEmployeeValues(prev => ({...prev, ativo: e.target.value === "true"}))}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                ) : (
                  <p style={{ margin: "4px 0", color: selectedEmployeeForDetails.ativo ? "#4caf50" : "#f44336", textShadow: "none" }}>
                    {selectedEmployeeForDetails.ativo ? "Ativo" : "Inativo"}
                  </p>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ color: "#333", borderBottom: "1px solid #ddd", paddingBottom: 8, textShadow: "none" }}>
                Histórico de Holerites / Recibos
              </h4>
              <div style={{ 
                maxHeight: "300px", 
                overflow: "auto", 
                border: "1px solid #ddd", 
                borderRadius: 4,
                padding: 12
              }}>
                {payslipHistory.length === 0 ? (
                  <p style={{ color: "#666", fontStyle: "italic", textAlign: "center" }}>
                    Nenhum holerite gerado ainda.
                  </p>
                ) : (
                  <div>
                    {payslipHistory.map((record) => (
                      <div 
                        key={record.id}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          background: "#f5f5f5",
                          borderRadius: "4px",
                          borderLeft: `4px solid ${record.type === 'recibo' ? '#4caf50' : '#1976d2'}`
                        }}
                      >
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          marginBottom: "4px"
                        }}>
                          <strong style={{ color: record.type === 'recibo' ? '#4caf50' : '#1976d2', textShadow: "none" }}>
                            {record.type === 'recibo' ? '🧾' : '📄'} {record.referenceMonth}
                            <span style={{ fontSize: "10px", marginLeft: "8px", color: "#666" , textShadow: "none"}}>
                              ({record.type === 'recibo' ? 'RECIBO' : 'HOLERITE'})
                            </span>
                          </strong>
                          <span style={{ fontSize: "11px", color: "#666", textShadow: "none" }}>
                            🕐 {record.generatedAtFormatted}
                          </span>
                        </div>
                        {record.filePath && (
                          <div style={{ fontSize: "12px", color: "#888", textShadow: "none" }}>
                            📎 {record.filePath}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  style={{
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 16px",
                    marginTop: 12,
                    cursor: "pointer",
                    width: "100%"
                  }}
                  onClick={generatePayslipJPG}
                >
                  📥 Gerar Novo Holerite (JPEG)
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              {isEditingInModal ? (
                <>
                  <button
                    style={{
                      background: "#4caf50",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "10px 20px",
                      marginRight: 8,
                      cursor: "pointer"
                    }}
                    onClick={handleSaveEmployeeDetails}
                  >
                    Salvar Alterações
                  </button>
                  <button
                    style={{
                      background: "#f44336",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "10px 20px",
                      marginRight: 8,
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setIsEditingInModal(false);
                      // Resetar valores
                      setEditEmployeeValues({
                        contato: selectedEmployeeForDetails.contato || "",
                        dataEntrada: selectedEmployeeForDetails.dataEntrada ? selectedEmployeeForDetails.dataEntrada.split('T')[0] : "",
                        ativo: selectedEmployeeForDetails.ativo !== false
                      });
                    }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  style={{
                    background: "#4caf50",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "10px 20px",
                    marginRight: 8,
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    setSelectedEmployeeId(selectedEmployeeForDetails.id);
                    setIsEditingInModal(true);
                  }}
                >
                  Habilitar Edição
                </button>
              )}
              <button
                style={{
                  background: "#666",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "10px 20px",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setShowEmployeeDetails(false);
                  setIsEditingInModal(false);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ponto;