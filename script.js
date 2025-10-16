// Firebase imports and configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgNRIVJw3ys5kNrCCOMV-GP4JyTtGmBgo",
  authDomain: "monitoria-bcc25.firebaseapp.com",
  databaseURL: "https://monitoria-bcc25-default-rtdb.firebaseio.com",
  projectId: "monitoria-bcc25",
  storageBucket: "monitoria-bcc25.firebasestorage.app",
  messagingSenderId: "41510527087",
  appId: "1:41510527087:web:cc251ec5802eb69a61ed9a",
  measurementId: "G-KDBFN0PLDR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Questões do formulário
let questoes = [
    "Questão 1: O avaliado demonstrou conhecimento técnico adequado?",
    "Questão 2: A comunicação foi clara e objetiva?",
    "Questão 3: O avaliado seguiu os procedimentos padrão?",
    "Questão 4: Houve adequação ao tempo previsto?",
    "Questão 5: O avaliado demonstrou profissionalismo?",
    "Questão 6: A qualidade do trabalho foi satisfatória?",
    "Questão 7: O avaliado demonstrou iniciativa?",
    "Questão 8: Houve boa interação com a equipe?",
    "Questão 9: O resultado final foi adequado?",
    "Questão 10: Recomendaria o avaliado para futuras atividades?"
];

// Renderizar questões
function renderizarQuestoes() {
    const container = document.getElementById('questionsContainer');
    
    questoes.forEach((questao, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.innerHTML = `
            <div class="question-text">${questao}</div>
            <div class="checkbox-group">
                <label class="checkbox-label">
                    <input type="checkbox" name="q${index}_sim" data-question="${index}" data-value="sim">
                    <span>Sim</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" name="q${index}_nao" data-question="${index}" data-value="nao">
                    <span>Não</span>
                </label>
            </div>
        `;
        container.appendChild(questionDiv);
    });

    // Adicionar listeners para garantir que apenas um checkbox seja selecionado por questão
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const questionNum = this.dataset.question;
            const value = this.dataset.value;
            
            if (this.checked) {
                // Desmarcar o outro checkbox da mesma questão
                const otherValue = value === 'sim' ? 'nao' : 'sim';
                const otherCheckbox = document.querySelector(`input[name="q${questionNum}_${otherValue}"]`);
                if (otherCheckbox) {
                    otherCheckbox.checked = false;
                }
            }
        });
    });
}

// Calcular resultado
function calcularResultado() {
    const dataAvaliacao = document.getElementById('dataAvaliacao').value;
    const dataAudio = document.getElementById('dataAudio').value;
    const nomeAvaliador = document.getElementById('nomeAvaliador').value;
    const nomeAvaliado = document.getElementById('nomeAvaliado').value;
    const nomeAudio = document.getElementById('nomeAudio').value;
    const observacao = document.getElementById('observacao').value;

    // Validar campos obrigatórios
    if (!dataAvaliacao || !dataAudio || !nomeAvaliador || !nomeAvaliado || !nomeAudio) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    let nota = 0;
    const respostas = [];
    let primeiraQuestaoNao = false;

    // Calcular pontuação
    for (let i = 0; i < questoes.length; i++) {
        const simCheckbox = document.querySelector(`input[name="q${i}_sim"]`);
        const naoCheckbox = document.querySelector(`input[name="q${i}_nao"]`);

        if (!simCheckbox.checked && !naoCheckbox.checked) {
            alert(`Por favor, responda a questão ${i + 1}.`);
            return;
        }

        const resposta = simCheckbox.checked ? 'Sim' : 'Não';
        respostas.push({
            questao: questoes[i],
            resposta: resposta
        });

        // Verificar primeira questão
        if (i === 0 && naoCheckbox.checked) {
            primeiraQuestaoNao = true;
        }

        if (simCheckbox.checked) {
            nota++;
        }
    }

    // Se a primeira questão for "Não", anula todos os pontos
    if (primeiraQuestaoNao) {
        nota = 0;
    }

    // Determinar status baseado na nova lógica
    let status = '';
    let statusClass = '';
    if (nota < 4) {
        status = 'REPROVADO';
        statusClass = 'status-reprovado';
    } else if (nota >= 4 && nota < 8) {
        status = 'APROVADO COM RESTRIÇÃO';
        statusClass = 'status-orientacao';
    } else {
        status = 'APROVADO';
        statusClass = 'status-aprovado';
    }

    // Buscar CPF ou RE do avaliado
    const avaliadoInfo = buscarInfoAvaliado(nomeAvaliado);

    const resultadoData = {
        dataAvaliacao,
        dataAudio,
        nomeAvaliador,
        nomeAvaliado,
        avaliadoIdentificador: avaliadoInfo.identificador, // CPF ou RE
        avaliadoCategoria: avaliadoInfo.categoria,
        nomeAudio,
        observacao,
        nota,
        notaMaxima: questoes.length,
        status,
        statusClass,
        respostas,
        primeiraQuestaoAnulou: primeiraQuestaoNao,
        timestamp: new Date().toISOString()
    };

    // Salvar resultado no Firebase
    salvarResultadoFirebase(resultadoData);

    // Exibir resultado
    exibirResultado(resultadoData);
}

// Buscar informações do avaliado (CPF ou RE)
function buscarInfoAvaliado(nomeAvaliado) {
    const avaliadosArray = Object.values(cadastros.avaliados);
    const avaliado = avaliadosArray.find(a => {
        if (a.categoria === 'militar') {
            return `${a.posto} - ${a.nome}` === nomeAvaliado || a.nome === nomeAvaliado;
        } else {
            return a.nome === nomeAvaliado;
        }
    });

    if (avaliado) {
        return {
            identificador: avaliado.categoria === 'militar' ? avaliado.re : avaliado.cpf,
            categoria: avaliado.categoria
        };
    }

    return {
        identificador: 'Não informado',
        categoria: 'Não informado'
    };
}

// Salvar resultado no Firebase
function salvarResultadoFirebase(dados) {
    const resultadosRef = ref(database, 'resultados');
    const novoResultadoRef = push(resultadosRef);
    
    set(novoResultadoRef, dados)
        .then(() => {
            console.log('Resultado salvo com sucesso no Firebase!');
        })
        .catch((error) => {
            console.error('Erro ao salvar resultado:', error);
            alert('Erro ao salvar resultado no banco de dados.');
        });
}

// Exibir resultado
function exibirResultado(dados) {
    const resultadoSection = document.getElementById('resultadoSection');
    const resultadoContent = document.getElementById('resultadoContent');

    let respostasHtml = '';
    dados.respostas.forEach((r, index) => {
        const respostaClass = r.resposta === 'Sim' ? 'resposta-sim' : 'resposta-nao';
        respostasHtml += `
            <div class="resposta-item ${respostaClass}">
                <strong>Questão ${index + 1}:</strong> ${r.questao}<br>
                <strong>Resposta:</strong> ${r.resposta}
            </div>
        `;
    });

    const avisoAnulacao = dados.primeiraQuestaoAnulou ? 
        '<div class="aviso-anulacao">⚠️ Primeira questão respondida como NÃO - Nota zerada</div>' : '';

    resultadoContent.innerHTML = `
        <div class="resultado-info">
            <strong>Data Avaliação:</strong> ${new Date(dados.dataAvaliacao).toLocaleDateString('pt-BR')}
        </div>
        <div class="resultado-info">
            <strong>Data Áudio:</strong> ${new Date(dados.dataAudio).toLocaleDateString('pt-BR')}
        </div>
        <div class="resultado-info">
            <strong>Avaliador:</strong> ${dados.nomeAvaliador}
        </div>
        <div class="resultado-info">
            <strong>Avaliado:</strong> ${dados.nomeAvaliado}
        </div>
        <div class="resultado-info">
            <strong>${dados.avaliadoCategoria === 'militar' ? 'RE' : 'CPF'}:</strong> ${dados.avaliadoIdentificador}
        </div>
        <div class="resultado-info">
            <strong>Nome do Áudio:</strong> ${dados.nomeAudio}
        </div>
        ${dados.observacao ? `<div class="resultado-info"><strong>Observação:</strong> ${dados.observacao}</div>` : ''}
        
        ${avisoAnulacao}
        
        <div class="nota-display ${dados.statusClass}">
            Nota: ${dados.nota}/${dados.notaMaxima}<br>
            Status: ${dados.status}
        </div>

        <div class="resultado-acoes">
            <button class="btn-download" onclick="baixarResultadoPDF()">📥 Baixar Resultado (PDF)</button>
            <button class="btn-email" onclick="enviarEmail()">📧 Enviar por Email</button>
        </div>

        <div class="respostas-list">
            <h3>Respostas:</h3>
            ${respostasHtml}
        </div>
    `;

    // Armazenar dados temporariamente para download/email
    window.ultimoResultado = dados;

    resultadoSection.style.display = 'block';
    resultadoSection.scrollIntoView({ behavior: 'smooth' });
}

// Função para baixar resultado como PDF
window.baixarResultadoPDF = function() {
    const dados = window.ultimoResultado;
    if (!dados) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurações
    let yPosition = 20;
    const lineHeight = 7;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    // Título
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RESULTADO DA AVALIAÇÃO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Informações básicas
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    doc.text(`Data da Avaliação: ${new Date(dados.dataAvaliacao).toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += lineHeight;
    
    doc.text(`Data do Áudio: ${new Date(dados.dataAudio).toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += lineHeight;
    
    doc.text(`Avaliador: ${dados.nomeAvaliador}`, margin, yPosition);
    yPosition += lineHeight;
    
    doc.text(`Avaliado: ${dados.nomeAvaliado}`, margin, yPosition);
    yPosition += lineHeight;
    
    doc.text(`${dados.avaliadoCategoria === 'militar' ? 'RE' : 'CPF'}: ${dados.avaliadoIdentificador}`, margin, yPosition);
    yPosition += lineHeight;
    
    doc.text(`Nome do Áudio: ${dados.nomeAudio}`, margin, yPosition);
    yPosition += lineHeight;

    if (dados.observacao) {
        yPosition += 3;
        doc.setFont(undefined, 'bold');
        doc.text('Observação:', margin, yPosition);
        yPosition += lineHeight;
        doc.setFont(undefined, 'normal');
        const obsLines = doc.splitTextToSize(dados.observacao, maxWidth);
        doc.text(obsLines, margin, yPosition);
        yPosition += (obsLines.length * lineHeight);
    }

    yPosition += 10;

    // Aviso de anulação se necessário
    if (dados.primeiraQuestaoAnulou) {
        doc.setFillColor(255, 243, 205);
        doc.rect(margin, yPosition - 5, maxWidth, 12, 'F');
        doc.setFont(undefined, 'bold');
        doc.text('⚠️ ATENÇÃO: Primeira questão respondida como NÃO - Nota zerada', margin + 2, yPosition + 2);
        yPosition += 15;
    }

    // Nota e Status
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`NOTA FINAL: ${dados.nota}/${dados.notaMaxima}`, margin, yPosition);
    yPosition += lineHeight + 2;
    
    // Cor do status
    if (dados.status === 'APROVADO') {
        doc.setTextColor(76, 175, 80);
    } else if (dados.status === 'REPROVADO') {
        doc.setTextColor(244, 67, 54);
    } else {
        doc.setTextColor(255, 152, 0);
    }
    doc.text(`STATUS: ${dados.status}`, margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 15;

    // Respostas
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RESPOSTAS:', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    dados.respostas.forEach((r, index) => {
        // Verificar se precisa de nova página
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFont(undefined, 'bold');
        const questaoLines = doc.splitTextToSize(`Questão ${index + 1}: ${r.questao}`, maxWidth);
        doc.text(questaoLines, margin, yPosition);
        yPosition += (questaoLines.length * lineHeight);

        doc.setFont(undefined, 'normal');
        if (r.resposta === 'Sim') {
            doc.setTextColor(76, 175, 80);
        } else {
            doc.setTextColor(244, 67, 54);
        }
        doc.text(`Resposta: ${r.resposta}`, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += lineHeight + 3;
    });

    // Salvar PDF
    doc.save(`avaliacao_${dados.nomeAvaliado.replace(/\s+/g, '_')}_${dados.dataAvaliacao}.pdf`);
}

// Função para baixar resultado como texto
window.baixarResultado = function() {
    const dados = window.ultimoResultado;
    if (!dados) return;

    let texto = '=== RESULTADO DA AVALIAÇÃO ===\n\n';
    texto += `Data da Avaliação: ${new Date(dados.dataAvaliacao).toLocaleDateString('pt-BR')}\n`;
    texto += `Data do Áudio: ${new Date(dados.dataAudio).toLocaleDateString('pt-BR')}\n`;
    texto += `Avaliador: ${dados.nomeAvaliador}\n`;
    texto += `Avaliado: ${dados.nomeAvaliado}\n`;
    texto += `${dados.avaliadoCategoria === 'militar' ? 'RE' : 'CPF'}: ${dados.avaliadoIdentificador}\n`;
    texto += `Nome do Áudio: ${dados.nomeAudio}\n`;
    if (dados.observacao) {
        texto += `Observação: ${dados.observacao}\n`;
    }
    texto += '\n';
    
    if (dados.primeiraQuestaoAnulou) {
        texto += '⚠️ ATENÇÃO: Primeira questão respondida como NÃO - Nota zerada\n\n';
    }

    texto += `NOTA FINAL: ${dados.nota}/${dados.notaMaxima}\n`;
    texto += `STATUS: ${dados.status}\n\n`;

    texto += '=== RESPOSTAS ===\n\n';
    dados.respostas.forEach((r, index) => {
        texto += `Questão ${index + 1}: ${r.questao}\n`;
        texto += `Resposta: ${r.resposta}\n\n`;
    });

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `avaliacao_${dados.nomeAvaliado.replace(/\s+/g, '_')}_${dados.dataAvaliacao}.txt`;
    link.click();
}

// Função para enviar resultado por email
window.enviarEmail = function() {
    const dados = window.ultimoResultado;
    if (!dados) return;

    let corpo = `RESULTADO DA AVALIAÇÃO\n\n`;
    corpo += `Data da Avaliação: ${new Date(dados.dataAvaliacao).toLocaleDateString('pt-BR')}\n`;
    corpo += `Data do Áudio: ${new Date(dados.dataAudio).toLocaleDateString('pt-BR')}\n`;
    corpo += `Avaliador: ${dados.nomeAvaliador}\n`;
    corpo += `Avaliado: ${dados.nomeAvaliado}\n`;
    corpo += `${dados.avaliadoCategoria === 'militar' ? 'RE' : 'CPF'}: ${dados.avaliadoIdentificador}\n`;
    corpo += `Nome do Áudio: ${dados.nomeAudio}\n\n`;
    
    if (dados.primeiraQuestaoAnulou) {
        corpo += `ATENÇÃO: Primeira questão respondida como NÃO - Nota zerada\n\n`;
    }

    corpo += `NOTA FINAL: ${dados.nota}/${dados.notaMaxima}\n`;
    corpo += `STATUS: ${dados.status}\n\n`;

    corpo += `Respostas detalhadas disponíveis no sistema.`;

    const assunto = `Resultado Avaliação - ${dados.nomeAvaliado} - ${dados.dataAvaliacao}`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    
    window.location.href = mailtoLink;
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    carregarQuestoesFirebase(); // Carregar questões antes de renderizar
    
    document.getElementById('gerarResultado').addEventListener('click', calcularResultado);
    
    // Converter campos de texto para maiúsculas
    const camposMaiusculas = ['nomeAvaliador', 'nomeAvaliado', 'nomeAudio'];
    camposMaiusculas.forEach(campoId => {
        const campo = document.getElementById(campoId);
        campo.addEventListener('input', function() {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.toUpperCase();
            this.setSelectionRange(start, end);
        });
    });
    
    // Sistema de cadastros
    initCadastros();
    
    // Inicializar autocomplete
    initAutocomplete();
    
    // Inicializar gerenciador de questões
    initGerenciadorQuestoes();
    
    // Inicializar tabs
    initTabs();
    
    // Inicializar dark mode
    initDarkMode();
    
    // Inicializar E-selotex
    initEselotex();
});

// Dark Mode
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    const darkModeText = document.getElementById('darkModeText');
    
    // Verificar preferência salva
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeIcon.textContent = '☀️';
        darkModeText.textContent = 'Modo Claro';
    }
    
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const isNowDark = document.body.classList.contains('dark-mode');
        
        if (isNowDark) {
            darkModeIcon.textContent = '☀️';
            darkModeText.textContent = 'Modo Claro';
            localStorage.setItem('darkMode', 'true');
        } else {
            darkModeIcon.textContent = '🌙';
            darkModeText.textContent = 'Modo Escuro';
            localStorage.setItem('darkMode', 'false');
        }
    });
}

// Sistema de Cadastros
let categoriaCadastro = null; // 'militar' ou 'civil'
const cadastros = {
    avaliadores: {},
    avaliados: {}
};

function initCadastros() {
    const modal = document.getElementById('modalCadastros');
    const btnCadastros = document.getElementById('btnCadastros');
    const closeBtn = document.querySelector('.close');
    const tipoCadastroSelect = document.getElementById('tipoCadastro');
    const categoriaCadastroSelect = document.getElementById('categoriaCadastro');
    const btnSalvarCadastro = document.getElementById('btnSalvarCadastro');
    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');

    // Carregar cadastros do Firebase
    carregarCadastrosFirebase();

    // Abrir modal
    btnCadastros.addEventListener('click', function() {
        modal.style.display = 'block';
        atualizarListaCadastros();
        renderizarListaQuestoes();
    });

    // Fechar modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        resetarFormulario();
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            resetarFormulario();
        }
    });

    // Selecionar categoria ao mudar
    categoriaCadastroSelect.addEventListener('change', function() {
        categoriaCadastro = this.value;
        if (categoriaCadastro === 'militar') {
            mostrarCampos('militar');
        } else if (categoriaCadastro === 'civil') {
            mostrarCampos('civil');
        } else {
            document.getElementById('camposMilitar').style.display = 'none';
            document.getElementById('camposCivil').style.display = 'none';
        }
    });

    // Salvar cadastro
    btnSalvarCadastro.addEventListener('click', salvarCadastro);

    // Busca
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length > 0) {
            realizarBusca(query, searchType.value);
        } else {
            document.getElementById('searchResults').innerHTML = '';
        }
    });

    searchType.addEventListener('change', function() {
        const query = searchInput.value.trim();
        if (query.length > 0) {
            realizarBusca(query, this.value);
        }
    });
}

function mostrarCampos(categoria) {
    const camposMilitar = document.getElementById('camposMilitar');
    const camposCivil = document.getElementById('camposCivil');
    
    if (categoria === 'militar') {
        camposMilitar.style.display = 'block';
        camposCivil.style.display = 'none';
    } else {
        camposMilitar.style.display = 'none';
        camposCivil.style.display = 'block';
    }
}

async function verificarUnicidade(tipo, valor) {
    const avaliadores = Object.values(cadastros.avaliadores);
    const avaliados = Object.values(cadastros.avaliados);
    const todos = [...avaliadores, ...avaliados];
    
    return !todos.some(cadastro => {
        if (tipo === 're') {
            return cadastro.re === valor;
        } else {
            return cadastro.cpf === valor;
        }
    });
}

async function salvarCadastro() {
    const tipoCadastro = document.getElementById('tipoCadastro').value;
    const categoriaCadastroSelect = document.getElementById('categoriaCadastro').value;

    if (!tipoCadastro || !categoriaCadastroSelect) {
        alert('Por favor, selecione o tipo e a categoria.');
        return;
    }

    let cadastro = {
        tipo: tipoCadastro,
        categoria: categoriaCadastroSelect,
        timestamp: new Date().toISOString()
    };

    if (categoriaCadastroSelect === 'militar') {
        const posto = document.getElementById('postoGraduacao').value;
        const re = document.getElementById('re').value;
        const nome = document.getElementById('nomeGuerra').value;

        if (!posto || !re || !nome) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        // Verificar unicidade do RE
        const reUnico = await verificarUnicidade('re', re);
        if (!reUnico) {
            alert('Este RE já está cadastrado no sistema.');
            return;
        }

        cadastro.posto = posto;
        cadastro.re = re;
        cadastro.nome = nome;
    } else {
        const cpf = document.getElementById('cpf').value;
        const nome = document.getElementById('nomeCompleto').value;

        if (!cpf || !nome) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        // Verificar unicidade do CPF
        const cpfUnico = await verificarUnicidade('cpf', cpf);
        if (!cpfUnico) {
            alert('Este CPF já está cadastrado no sistema.');
            return;
        }

        cadastro.cpf = cpf;
        cadastro.nome = nome;
    }

    // Salvar no Firebase
    salvarCadastroFirebase(cadastro);

    alert('Cadastro realizado com sucesso!');
    limparCamposFormulario();
    resetarFormulario();
}

// Salvar cadastro no Firebase
function salvarCadastroFirebase(cadastro) {
    const caminho = cadastro.tipo === 'avaliador' ? 'cadastros/avaliadores' : 'cadastros/avaliados';
    const cadastrosRef = ref(database, caminho);
    const novoCadastroRef = push(cadastrosRef);
    
    set(novoCadastroRef, cadastro)
        .then(() => {
            console.log('Cadastro salvo com sucesso no Firebase!');
        })
        .catch((error) => {
            console.error('Erro ao salvar cadastro:', error);
            alert('Erro ao salvar cadastro no banco de dados.');
        });
}

// Carregar cadastros do Firebase
function carregarCadastrosFirebase() {
    // Carregar avaliadores
    const avaliadoresRef = ref(database, 'cadastros/avaliadores');
    onValue(avaliadoresRef, (snapshot) => {
        cadastros.avaliadores = {};
        snapshot.forEach((childSnapshot) => {
            cadastros.avaliadores[childSnapshot.key] = childSnapshot.val();
        });
        atualizarListaCadastros();
    });

    // Carregar avaliados
    const avaliadosRef = ref(database, 'cadastros/avaliados');
    onValue(avaliadosRef, (snapshot) => {
        cadastros.avaliados = {};
        snapshot.forEach((childSnapshot) => {
            cadastros.avaliados[childSnapshot.key] = childSnapshot.val();
        });
        atualizarListaCadastros();
    });
}

function limparCamposFormulario() {
    document.getElementById('tipoCadastro').value = '';
    document.getElementById('categoriaCadastro').value = '';
    document.getElementById('postoGraduacao').value = '';
    document.getElementById('re').value = '';
    document.getElementById('nomeGuerra').value = '';
    document.getElementById('cpf').value = '';
    document.getElementById('nomeCompleto').value = '';
}

function resetarFormulario() {
    categoriaCadastro = null;
    document.getElementById('camposMilitar').style.display = 'none';
    document.getElementById('camposCivil').style.display = 'none';
    limparCamposFormulario();
}

function atualizarListaCadastros() {
    const avaliadoresLista = document.getElementById('avaliadoresLista');
    const avaliadosLista = document.getElementById('avaliadosLista');

    // Listar últimos 3 avaliadores
    avaliadoresLista.innerHTML = '';
    const avaliadoresArray = Object.entries(cadastros.avaliadores)
        .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
        .slice(0, 3);
    
    if (avaliadoresArray.length === 0) {
        avaliadoresLista.innerHTML = '<p style="color: #999;">Nenhum avaliador cadastrado</p>';
    } else {
        avaliadoresArray.forEach(([id, cadastro]) => {
            avaliadoresLista.appendChild(criarItemCadastro(id, cadastro, false));
        });
    }

    // Listar últimos 3 avaliados
    avaliadosLista.innerHTML = '';
    const avaliadosArray = Object.entries(cadastros.avaliados)
        .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
        .slice(0, 3);
    
    if (avaliadosArray.length === 0) {
        avaliadosLista.innerHTML = '<p style="color: #999;">Nenhum avaliado cadastrado</p>';
    } else {
        avaliadosArray.forEach(([id, cadastro]) => {
            avaliadosLista.appendChild(criarItemCadastro(id, cadastro, false));
        });
    }
}

function criarItemCadastro(id, cadastro, mostrarAcoes = true) {
    const div = document.createElement('div');
    div.className = 'lista-item';
    div.id = `cadastro-${id}`;
    
    let infoHtml = '';
    if (cadastro.categoria === 'militar') {
        infoHtml = `
            <div class="result-info"><strong>Posto:</strong> ${cadastro.posto}</div>
            <div class="result-info"><strong>Nome:</strong> ${cadastro.nome}</div>
            <div class="result-info"><strong>RE:</strong> ${cadastro.re}</div>
        `;
    } else {
        infoHtml = `
            <div class="result-info"><strong>Nome:</strong> ${cadastro.nome}</div>
            <div class="result-info"><strong>CPF:</strong> ${cadastro.cpf}</div>
        `;
    }

    div.innerHTML = infoHtml;

    if (mostrarAcoes) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'result-actions';
        actionsDiv.innerHTML = `
            <button class="btn-edit" data-id="${id}">Editar</button>
            <button class="btn-delete" data-id="${id}">Excluir</button>
        `;
        div.appendChild(actionsDiv);

        // Event listeners
        actionsDiv.querySelector('.btn-edit').addEventListener('click', () => editarCadastro(id, cadastro, div));
        actionsDiv.querySelector('.btn-delete').addEventListener('click', () => excluirCadastro(id, cadastro.tipo));
    }

    return div;
}

function realizarBusca(query, tipo) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    const avaliadores = Object.entries(cadastros.avaliadores);
    const avaliados = Object.entries(cadastros.avaliados);
    const todos = [...avaliadores, ...avaliados];

    const resultados = todos.filter(([id, cadastro]) => {
        if (tipo === 're') {
            return cadastro.re && cadastro.re.toLowerCase().includes(query.toLowerCase());
        } else {
            return cadastro.cpf && cadastro.cpf.toLowerCase().includes(query.toLowerCase());
        }
    });

    if (resultados.length === 0) {
        searchResults.innerHTML = '<p style="color: #999; padding: 10px;">Nenhum resultado encontrado</p>';
        return;
    }

    resultados.forEach(([id, cadastro]) => {
        searchResults.appendChild(criarItemCadastro(id, cadastro, true));
    });
}

function editarCadastro(id, cadastro, elemento) {
    elemento.classList.add('editing');
    
    let camposHtml = '';
    if (cadastro.categoria === 'militar') {
        camposHtml = `
            <div class="edit-field">
                <label>Posto/Graduação:</label>
                <select id="edit-posto-${id}">
                    <option value="Cel PM" ${cadastro.posto === 'Cel PM' ? 'selected' : ''}>Cel PM</option>
                    <option value="Ten Cel PM" ${cadastro.posto === 'Ten Cel PM' ? 'selected' : ''}>Ten Cel PM</option>
                    <option value="Maj PM" ${cadastro.posto === 'Maj PM' ? 'selected' : ''}>Maj PM</option>
                    <option value="Cap PM" ${cadastro.posto === 'Cap PM' ? 'selected' : ''}>Cap PM</option>
                    <option value="1º Ten PM" ${cadastro.posto === '1º Ten PM' ? 'selected' : ''}>1º Ten PM</option>
                    <option value="2º Ten PM" ${cadastro.posto === '2º Ten PM' ? 'selected' : ''}>2º Ten PM</option>
                    <option value="Asp Of PM" ${cadastro.posto === 'Asp Of PM' ? 'selected' : ''}>Asp Of PM</option>
                    <option value="Sub Ten PM" ${cadastro.posto === 'Sub Ten PM' ? 'selected' : ''}>Sub Ten PM</option>
                    <option value="1º Sgt PM" ${cadastro.posto === '1º Sgt PM' ? 'selected' : ''}>1º Sgt PM</option>
                    <option value="2º Sgt PM" ${cadastro.posto === '2º Sgt PM' ? 'selected' : ''}>2º Sgt PM</option>
                    <option value="3º Sgt PM" ${cadastro.posto === '3º Sgt PM' ? 'selected' : ''}>3º Sgt PM</option>
                    <option value="Cb PM" ${cadastro.posto === 'Cb PM' ? 'selected' : ''}>Cb PM</option>
                    <option value="Sd PM 1ª Classe" ${cadastro.posto === 'Sd PM 1ª Classe' ? 'selected' : ''}>Sd PM 1ª Classe</option>
                    <option value="Sd PM 2ª Classe" ${cadastro.posto === 'Sd PM 2ª Classe' ? 'selected' : ''}>Sd PM 2ª Classe</option>
                </select>
            </div>
            <div class="edit-field">
                <label>Nome de Guerra:</label>
                <input type="text" id="edit-nome-${id}" value="${cadastro.nome}">
            </div>
            <div class="edit-field">
                <label>RE:</label>
                <input type="text" id="edit-re-${id}" value="${cadastro.re}" readonly>
            </div>
        `;
    } else {
        camposHtml = `
            <div class="edit-field">
                <label>Nome Completo:</label>
                <input type="text" id="edit-nome-${id}" value="${cadastro.nome}">
            </div>
            <div class="edit-field">
                <label>CPF:</label>
                <input type="text" id="edit-cpf-${id}" value="${cadastro.cpf}" readonly>
            </div>
        `;
    }

    elemento.innerHTML = camposHtml + `
        <div class="result-actions">
            <button class="btn-save" data-id="${id}">Salvar</button>
            <button class="btn-cancel" data-id="${id}">Cancelar</button>
        </div>
    `;

    elemento.querySelector('.btn-save').addEventListener('click', () => salvarEdicao(id, cadastro));
    elemento.querySelector('.btn-cancel').addEventListener('click', () => cancelarEdicao(id, cadastro));
}

function salvarEdicao(id, cadastroOriginal) {
    const cadastroAtualizado = { ...cadastroOriginal };

    if (cadastroOriginal.categoria === 'militar') {
        cadastroAtualizado.posto = document.getElementById(`edit-posto-${id}`).value;
        cadastroAtualizado.nome = document.getElementById(`edit-nome-${id}`).value;
        cadastroAtualizado.re = document.getElementById(`edit-re-${id}`).value;
    } else {
        cadastroAtualizado.nome = document.getElementById(`edit-nome-${id}`).value;
        cadastroAtualizado.cpf = document.getElementById(`edit-cpf-${id}`).value;
    }

    if (!cadastroAtualizado.nome) {
        alert('Por favor, preencha o nome.');
        return;
    }

    // Atualizar no Firebase
    const caminho = cadastroOriginal.tipo === 'avaliador' ? 
        `cadastros/avaliadores/${id}` : 
        `cadastros/avaliados/${id}`;
    
    const cadastroRef = ref(database, caminho);
    set(cadastroRef, cadastroAtualizado)
        .then(() => {
            alert('Cadastro atualizado com sucesso!');
        })
        .catch((error) => {
            console.error('Erro ao atualizar cadastro:', error);
            alert('Erro ao atualizar cadastro no banco de dados.');
        });
}

function cancelarEdicao(id, cadastro) {
    const elemento = document.getElementById(`cadastro-${id}`);
    elemento.classList.remove('editing');
    
    const novoElemento = criarItemCadastro(id, cadastro, true);
    elemento.replaceWith(novoElemento);
}

function excluirCadastro(id, tipo) {
    if (!confirm('Tem certeza que deseja excluir este cadastro?')) {
        return;
    }

    const caminho = tipo === 'avaliador' ? 
        `cadastros/avaliadores/${id}` : 
        `cadastros/avaliados/${id}`;
    
    const cadastroRef = ref(database, caminho);
    
    remove(cadastroRef)
        .then(() => {
            alert('Cadastro excluído com sucesso!');
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
        })
        .catch((error) => {
            console.error('Erro ao excluir cadastro:', error);
            alert('Erro ao excluir cadastro do banco de dados.');
        });
}

// Autocomplete para avaliador e avaliado
function initAutocomplete() {
    const inputAvaliador = document.getElementById('nomeAvaliador');
    const inputAvaliado = document.getElementById('nomeAvaliado');
    const dropdownAvaliador = document.getElementById('autocompleteAvaliador');
    const dropdownAvaliado = document.getElementById('autocompleteAvaliado');

    // Autocomplete para avaliador
    inputAvaliador.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        if (query.length > 0) {
            mostrarSugestoes(query, cadastros.avaliadores, dropdownAvaliador, inputAvaliador);
        } else {
            dropdownAvaliador.classList.remove('show');
        }
    });

    // Autocomplete para avaliado
    inputAvaliado.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        if (query.length > 0) {
            mostrarSugestoes(query, cadastros.avaliados, dropdownAvaliado, inputAvaliado);
        } else {
            dropdownAvaliado.classList.remove('show');
        }
    });

    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(e) {
        if (!inputAvaliador.contains(e.target) && !dropdownAvaliador.contains(e.target)) {
            dropdownAvaliador.classList.remove('show');
        }
        if (!inputAvaliado.contains(e.target) && !dropdownAvaliado.contains(e.target)) {
            dropdownAvaliado.classList.remove('show');
        }
    });
}

function mostrarSugestoes(query, lista, dropdown, input) {
    const listaArray = Object.values(lista);
    const filtrados = listaArray.filter(cadastro => {
        return cadastro.nome.toLowerCase().includes(query);
    });

    if (filtrados.length === 0) {
        dropdown.classList.remove('show');
        return;
    }

    dropdown.innerHTML = '';
    filtrados.forEach(cadastro => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        
        if (cadastro.categoria === 'militar') {
            item.innerHTML = `
                <strong>${cadastro.posto} - ${cadastro.nome}</strong>
                <small>RE: ${cadastro.re}</small>
            `;
        } else {
            item.innerHTML = `
                <strong>${cadastro.nome}</strong>
                <small>CPF: ${cadastro.cpf}</small>
            `;
        }

        item.addEventListener('click', function() {
            if (cadastro.categoria === 'militar') {
                input.value = `${cadastro.posto} - ${cadastro.nome}`;
            } else {
                input.value = cadastro.nome;
            }
            dropdown.classList.remove('show');
        });

        dropdown.appendChild(item);
    });

    dropdown.classList.add('show');
}

// Sistema de Gerenciamento de Questões
function initGerenciadorQuestoes() {
    const btnAdicionarQuestao = document.getElementById('btnAdicionarQuestao');
    
    btnAdicionarQuestao.addEventListener('click', adicionarQuestao);
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Remover active de todos os botões e conteúdos
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Adicionar active ao botão clicado e seu conteúdo
            this.classList.add('active');
            if (tabName === 'pessoas') {
                document.getElementById('tabPessoas').classList.add('active');
            } else if (tabName === 'questoes') {
                document.getElementById('tabQuestoes').classList.add('active');
                renderizarListaQuestoes();
            } else if (tabName === 'eselotex') {
                document.getElementById('tabEselotex').classList.add('active');
                renderizarCalendario();
            } else if (tabName === 'escalaobs') {
                document.getElementById('tabEscalaObs').classList.add('active');
                renderizarCalendarioEscala();
            }
        });
    });
}

function carregarQuestoesFirebase() {
    const questoesRef = ref(database, 'questoes');
    onValue(questoesRef, (snapshot) => {
        if (snapshot.exists()) {
            const questoesObj = snapshot.val();
            questoes = Object.values(questoesObj).sort((a, b) => a.ordem - b.ordem).map(q => q.texto);
        }
        renderizarQuestoes();
    });
}

function salvarQuestoesFirebase() {
    const questoesRef = ref(database, 'questoes');
    const questoesObj = questoes.map((texto, index) => ({
        texto,
        ordem: index,
        timestamp: new Date().toISOString()
    }));
    
    // Limpar questões antigas
    set(questoesRef, null).then(() => {
        // Salvar novas questões
        questoesObj.forEach((questao, index) => {
            const questaoRef = ref(database, `questoes/${index}`);
            set(questaoRef, questao);
        });
    });
}

function adicionarQuestao() {
    const textoQuestao = document.getElementById('textoQuestao').value.trim();
    
    if (!textoQuestao) {
        alert('Por favor, digite o texto da questão.');
        return;
    }
    
    questoes.push(textoQuestao);
    salvarQuestoesFirebase();
    renderizarQuestoes();
    renderizarListaQuestoes();
    
    document.getElementById('textoQuestao').value = '';
    alert('Questão adicionada com sucesso!');
}

function renderizarListaQuestoes() {
    const listaQuestoes = document.getElementById('listaQuestoes');
    listaQuestoes.innerHTML = '';
    
    if (questoes.length === 0) {
        listaQuestoes.innerHTML = '<p style="color: #999; padding: 10px;">Nenhuma questão cadastrada</p>';
        return;
    }
    
    questoes.forEach((questao, index) => {
        const div = document.createElement('div');
        div.className = 'questao-item-manager';
        div.id = `questao-${index}`;
        
        div.innerHTML = `
            <div class="questao-content">
                <div class="questao-numero">Questão ${index + 1}</div>
                <div class="questao-texto">${questao}</div>
            </div>
            <div class="questao-actions">
                <button class="btn-small btn-edit-small" data-index="${index}">Editar</button>
                <button class="btn-small btn-delete-small" data-index="${index}">Excluir</button>
            </div>
        `;
        
        div.querySelector('.btn-edit-small').addEventListener('click', () => editarQuestao(index));
        div.querySelector('.btn-delete-small').addEventListener('click', () => excluirQuestao(index));
        
        listaQuestoes.appendChild(div);
    });
}

function editarQuestao(index) {
    const div = document.getElementById(`questao-${index}`);
    div.classList.add('editing');
    
    const questaoAtual = questoes[index];
    
    div.innerHTML = `
        <div class="questao-content">
            <div class="questao-numero">Questão ${index + 1}</div>
            <textarea class="edit-questao-textarea" id="edit-questao-${index}">${questaoAtual}</textarea>
        </div>
        <div class="questao-actions">
            <button class="btn-small btn-save-small" data-index="${index}">Salvar</button>
            <button class="btn-small btn-cancel-small" data-index="${index}">Cancelar</button>
        </div>
    `;
    
    div.querySelector('.btn-save-small').addEventListener('click', () => salvarEdicaoQuestao(index));
    div.querySelector('.btn-cancel-small').addEventListener('click', () => renderizarListaQuestoes());
}

function salvarEdicaoQuestao(index) {
    const novoTexto = document.getElementById(`edit-questao-${index}`).value.trim();
    
    if (!novoTexto) {
        alert('Por favor, digite o texto da questão.');
        return;
    }
    
    questoes[index] = novoTexto;
    salvarQuestoesFirebase();
    renderizarQuestoes();
    renderizarListaQuestoes();
    
    alert('Questão atualizada com sucesso!');
}

function excluirQuestao(index) {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) {
        return;
    }
    
    questoes.splice(index, 1);
    salvarQuestoesFirebase();
    renderizarQuestoes();
    renderizarListaQuestoes();
    
    alert('Questão excluída com sucesso!');
}

// Sistema E-selotex - Calendário de Observações
let currentDate = new Date();
let selectedDate = null;
const observacoes = {};

// Sistema Escala Obs - Calendário de Observações com senha
let currentDateEscala = new Date();
let selectedDateEscala = null;
const observacoesEscala = {};
let escalaObsAuthenticated = false;
const SENHA_ESCALA = 'mystq';

function initEselotex() {
    carregarObservacoesFirebase();
    
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderizarCalendario();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderizarCalendario();
    });
    
    // Modal de observação
    const modalObservacao = document.getElementById('modalObservacao');
    const closeObservacao = document.getElementById('closeObservacao');
    const btnSalvarObservacao = document.getElementById('btnSalvarObservacao');
    const btnExcluirObservacao = document.getElementById('btnExcluirObservacao');
    
    closeObservacao.addEventListener('click', () => {
        modalObservacao.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modalObservacao) {
            modalObservacao.style.display = 'none';
        }
    });
    
    btnSalvarObservacao.addEventListener('click', salvarObservacao);
    btnExcluirObservacao.addEventListener('click', excluirObservacao);
    
    // Inicializar Escala Obs
    initEscalaObs();
}

function initEscalaObs() {
    carregarObservacoesEscalaFirebase();
    
    document.getElementById('prevMonthEscala').addEventListener('click', () => {
        currentDateEscala.setMonth(currentDateEscala.getMonth() - 1);
        renderizarCalendarioEscala();
    });
    
    document.getElementById('nextMonthEscala').addEventListener('click', () => {
        currentDateEscala.setMonth(currentDateEscala.getMonth() + 1);
        renderizarCalendarioEscala();
    });
    
    // Modal de observação Escala
    const modalObservacaoEscala = document.getElementById('modalObservacaoEscala');
    const closeObservacaoEscala = document.getElementById('closeObservacaoEscala');
    const btnSalvarObservacaoEscala = document.getElementById('btnSalvarObservacaoEscala');
    const btnExcluirObservacaoEscala = document.getElementById('btnExcluirObservacaoEscala');
    
    closeObservacaoEscala.addEventListener('click', () => {
        modalObservacaoEscala.style.display = 'none';
        escalaObsAuthenticated = false;
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modalObservacaoEscala) {
            modalObservacaoEscala.style.display = 'none';
            escalaObsAuthenticated = false;
        }
    });
    
    btnSalvarObservacaoEscala.addEventListener('click', salvarObservacaoEscala);
    btnExcluirObservacaoEscala.addEventListener('click', excluirObservacaoEscala);
    
    // Modal de senha
    const modalSenhaEscala = document.getElementById('modalSenhaEscala');
    const closeSenhaEscala = document.getElementById('closeSenhaEscala');
    const btnConfirmarSenha = document.getElementById('btnConfirmarSenha');
    const btnCancelarSenha = document.getElementById('btnCancelarSenha');
    
    closeSenhaEscala.addEventListener('click', () => {
        modalSenhaEscala.style.display = 'none';
        document.getElementById('senhaEscala').value = '';
    });
    
    btnCancelarSenha.addEventListener('click', () => {
        modalSenhaEscala.style.display = 'none';
        document.getElementById('senhaEscala').value = '';
    });
    
    btnConfirmarSenha.addEventListener('click', verificarSenhaEscala);
    
    // Enter para confirmar senha
    document.getElementById('senhaEscala').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verificarSenhaEscala();
        }
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modalSenhaEscala) {
            modalSenhaEscala.style.display = 'none';
            document.getElementById('senhaEscala').value = '';
        }
    });
}

function renderizarCalendario() {
    const calendar = document.getElementById('calendar');
    const currentMonthYear = document.getElementById('currentMonthYear');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Atualizar título
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;
    
    // Limpar calendário
    calendar.innerHTML = '';
    
    // Cabeçalho dos dias da semana
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    diasSemana.forEach(dia => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = dia;
        calendar.appendChild(header);
    });
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1).getDay();
    
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // Preencher dias vazios antes do primeiro dia
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendar.appendChild(emptyDay);
    }
    
    // Preencher dias do mês
    for (let day = 1; day <= lastDay; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Verificar se há observação
        if (observacoes[dateKey]) {
            dayElement.classList.add('has-observation');
        } else {
            dayElement.classList.add('no-observation');
        }
        
        // Destacar dia atual
        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        // Double click para abrir modal
        dayElement.addEventListener('dblclick', () => {
            abrirModalObservacao(dateKey, day);
        });
        
        calendar.appendChild(dayElement);
    }
}

function renderizarCalendarioEscala() {
    const calendar = document.getElementById('calendarEscala');
    const currentMonthYear = document.getElementById('currentMonthYearEscala');
    
    const year = currentDateEscala.getFullYear();
    const month = currentDateEscala.getMonth();
    
    // Atualizar título
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;
    
    // Limpar calendário
    calendar.innerHTML = '';
    
    // Cabeçalho dos dias da semana
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    diasSemana.forEach(dia => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = dia;
        calendar.appendChild(header);
    });
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1).getDay();
    
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // Preencher dias vazios antes do primeiro dia
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendar.appendChild(emptyDay);
    }
    
    // Preencher dias do mês
    for (let day = 1; day <= lastDay; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Verificar se há observação
        if (observacoesEscala[dateKey]) {
            dayElement.classList.add('has-observation');
        } else {
            dayElement.classList.add('no-observation');
        }
        
        // Destacar dia atual
        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        // Double click para abrir modal
        dayElement.addEventListener('dblclick', () => {
            abrirModalObservacaoEscala(dateKey, day);
        });
        
        calendar.appendChild(dayElement);
    }
}

function abrirModalObservacao(dateKey, day) {
    selectedDate = dateKey;
    const modal = document.getElementById('modalObservacao');
    const title = document.getElementById('observacaoTitle');
    const textarea = document.getElementById('observacaoTexto');
    const btnExcluir = document.getElementById('btnExcluirObservacao');
    
    const [year, month, dayNum] = dateKey.split('-');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    title.textContent = `Observação - ${day} de ${monthNames[parseInt(month) - 1]} de ${year}`;
    
    // Carregar observação existente
    if (observacoes[dateKey]) {
        textarea.value = observacoes[dateKey];
        btnExcluir.style.display = 'inline-block';
    } else {
        textarea.value = '';
        btnExcluir.style.display = 'none';
    }
    
    modal.style.display = 'block';
    textarea.focus();
}

function abrirModalObservacaoEscala(dateKey, day) {
    selectedDateEscala = dateKey;
    const modal = document.getElementById('modalObservacaoEscala');
    const title = document.getElementById('observacaoTitleEscala');
    const textarea = document.getElementById('observacaoTextoEscala');
    const btnExcluir = document.getElementById('btnExcluirObservacaoEscala');
    const actions = document.getElementById('escalaObsActions');
    
    const [year, month, dayNum] = dateKey.split('-');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    title.textContent = `Observação - ${day} de ${monthNames[parseInt(month) - 1]} de ${year}`;
    
    // Carregar observação existente
    if (observacoesEscala[dateKey]) {
        textarea.value = observacoesEscala[dateKey];
        btnExcluir.style.display = 'inline-block';
    } else {
        textarea.value = '';
        btnExcluir.style.display = 'none';
    }
    
    // Modo somente leitura por padrão
    textarea.readOnly = true;
    actions.style.display = 'none';
    
    modal.style.display = 'block';
    
    // Solicitar senha ao tentar editar
    textarea.addEventListener('focus', solicitarSenhaEscala);
}

function solicitarSenhaEscala() {
    if (!escalaObsAuthenticated) {
        const modalSenha = document.getElementById('modalSenhaEscala');
        modalSenha.style.display = 'block';
        document.getElementById('senhaEscala').focus();
    }
}

function verificarSenhaEscala() {
    const senhaDigitada = document.getElementById('senhaEscala').value;
    
    if (senhaDigitada === SENHA_ESCALA) {
        escalaObsAuthenticated = true;
        document.getElementById('modalSenhaEscala').style.display = 'none';
        document.getElementById('senhaEscala').value = '';
        
        // Habilitar edição
        const textarea = document.getElementById('observacaoTextoEscala');
        const actions = document.getElementById('escalaObsActions');
        textarea.readOnly = false;
        actions.style.display = 'flex';
        textarea.focus();
        
        alert('Autenticação bem-sucedida! Você pode editar agora.');
    } else {
        alert('Senha incorreta!');
        document.getElementById('senhaEscala').value = '';
        document.getElementById('senhaEscala').focus();
    }
}

function salvarObservacao() {
    const texto = document.getElementById('observacaoTexto').value.trim();
    
    if (!texto) {
        alert('Por favor, digite uma observação.');
        return;
    }
    
    // Salvar no Firebase
    const observacaoRef = ref(database, `eselotex/${selectedDate}`);
    set(observacaoRef, {
        texto: texto,
        timestamp: new Date().toISOString()
    })
    .then(() => {
        alert('Observação salva com sucesso!');
        document.getElementById('modalObservacao').style.display = 'none';
    })
    .catch((error) => {
        console.error('Erro ao salvar observação:', error);
        alert('Erro ao salvar observação.');
    });
}

function salvarObservacaoEscala() {
    if (!escalaObsAuthenticated) {
        alert('Você precisa autenticar para salvar!');
        return;
    }
    
    const texto = document.getElementById('observacaoTextoEscala').value.trim();
    
    if (!texto) {
        alert('Por favor, digite uma observação.');
        return;
    }
    
    // Salvar no Firebase
    const observacaoRef = ref(database, `escalaobs/${selectedDateEscala}`);
    set(observacaoRef, {
        texto: texto,
        timestamp: new Date().toISOString()
    })
    .then(() => {
        alert('Observação salva com sucesso!');
        document.getElementById('modalObservacaoEscala').style.display = 'none';
        escalaObsAuthenticated = false;
    })
    .catch((error) => {
        console.error('Erro ao salvar observação:', error);
        alert('Erro ao salvar observação.');
    });
}

function excluirObservacao() {
    if (!confirm('Tem certeza que deseja excluir esta observação?')) {
        return;
    }
    
    const observacaoRef = ref(database, `eselotex/${selectedDate}`);
    remove(observacaoRef)
    .then(() => {
        alert('Observação excluída com sucesso!');
        document.getElementById('modalObservacao').style.display = 'none';
    })
    .catch((error) => {
        console.error('Erro ao excluir observação:', error);
        alert('Erro ao excluir observação.');
    });
}

function excluirObservacaoEscala() {
    if (!escalaObsAuthenticated) {
        alert('Você precisa autenticar para excluir!');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta observação?')) {
        return;
    }
    
    const observacaoRef = ref(database, `escalaobs/${selectedDateEscala}`);
    remove(observacaoRef)
    .then(() => {
        alert('Observação excluída com sucesso!');
        document.getElementById('modalObservacaoEscala').style.display = 'none';
        escalaObsAuthenticated = false;
    })
    .catch((error) => {
        console.error('Erro ao excluir observação:', error);
        alert('Erro ao excluir observação.');
    });
}

function carregarObservacoesFirebase() {
    const observacoesRef = ref(database, 'eselotex');
    onValue(observacoesRef, (snapshot) => {
        Object.keys(observacoes).forEach(key => delete observacoes[key]);
        
        snapshot.forEach((childSnapshot) => {
            observacoes[childSnapshot.key] = childSnapshot.val().texto;
        });
        
        renderizarCalendario();
    });
}

function carregarObservacoesEscalaFirebase() {
    const observacoesRef = ref(database, 'escalaobs');
    onValue(observacoesRef, (snapshot) => {
        Object.keys(observacoesEscala).forEach(key => delete observacoesEscala[key]);
        
        snapshot.forEach((childSnapshot) => {
            observacoesEscala[childSnapshot.key] = childSnapshot.val().texto;
        });
        
        renderizarCalendarioEscala();
    });
}