import React, { useState } from 'react';
import { Button } from './Button';
import { PenTool, Download, Sparkles, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { generateEssayModel, generateEssayTopic } from '../services/geminiService';

interface EssayTemplateGeneratorProps {
  onBack: () => void;
}

export const EssayTemplateGenerator: React.FC<EssayTemplateGeneratorProps> = ({ onBack }) => {
  const [topic, setTopic] = useState('');
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [generatedModel, setGeneratedModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTopic = async () => {
    setIsLoadingTopic(true);
    setError(null);
    try {
      const newTopic = await generateEssayTopic();
      setTopic(newTopic);
      setGeneratedModel(null); // Reset model if topic changes
    } catch (err) {
      setError("Erro ao gerar tema. Tente novamente.");
    } finally {
      setIsLoadingTopic(false);
    }
  };

  const handleGenerateModel = async () => {
    if (!topic.trim()) return;
    setIsLoadingModel(true);
    setError(null);
    try {
      const model = await generateEssayModel(topic);
      setGeneratedModel(model);
    } catch (err) {
      setError("Erro ao gerar modelo de redação. Tente novamente.");
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleDownloadSheet = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Folha de Redação", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Tema: ${topic || "__________________________________________________"}`, 20, 30);
    
    // Lines
    let y = 50;
    for (let i = 1; i <= 30; i++) {
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`${i}`, 15, y);
        y += 8;
    }
    
    const fileName = window.prompt("Digite o nome do arquivo:", "folha_redacao") || "folha_redacao";
    doc.save(`${fileName}.pdf`);
  };

  const handleDownloadDraft = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RASCUNHÃO", pageWidth / 2, y, { align: "center" });
    y += 15;

    // Topic
    doc.setFontSize(12);
    doc.text("TEMA:", 20, y);
    doc.setFont("helvetica", "normal");
    const splitTopic = doc.splitTextToSize(topic || "__________________________________________________", pageWidth - 50);
    doc.text(splitTopic, 40, y);
    y += splitTopic.length * 7 + 10;

    // Introduction
    doc.setFont("helvetica", "bold");
    doc.text("Introdução:", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text("problema x: _________________________________________________________", 25, y);
    y += 8;
    doc.text("_____________________________________________________________________", 25, y);
    y += 10;
    doc.text("problema y: _________________________________________________________", 25, y);
    y += 8;
    doc.text("_____________________________________________________________________", 25, y);
    y += 15;

    // Development
    doc.setFont("helvetica", "bold");
    doc.text("Desenvolvimento:", 20, y);
    y += 8;
    
    // D1
    doc.text("D1:", 25, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text("A1 (argumento 1): ___________________________________________________", 30, y);
    y += 8;
    doc.text("_____________________________________________________________________", 30, y);
    y += 10;
    doc.text("R1 (repertório 1): __________________________________________________", 30, y);
    y += 8;
    doc.text("_____________________________________________________________________", 30, y);
    y += 12;

    // D2
    doc.setFont("helvetica", "bold");
    doc.text("D2:", 25, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text("A2 (argumento 2): ___________________________________________________", 30, y);
    y += 8;
    doc.text("_____________________________________________________________________", 30, y);
    y += 10;
    doc.text("R2 (repertório 2): __________________________________________________", 30, y);
    y += 8;
    doc.text("_____________________________________________________________________", 30, y);
    y += 15;

    // Conclusion
    doc.setFont("helvetica", "bold");
    doc.text("Conclusão:", 20, y);
    y += 8;
    doc.text("P.I (proposta de intervenção):", 25, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    
    const piItems = ["AGENTE", "AÇÃO", "MODO/MEIO", "FINALIDADE"];
    piItems.forEach(item => {
        doc.text(`- ${item}: _____________________________________________________________`, 30, y);
        y += 8;
        doc.text("_______________________________________________________________________", 32, y);
        y += 10;
    });

    const fileName = window.prompt("Digite o nome do arquivo:", "rascunhao_redacao") || "rascunhao_redacao";
    doc.save(`${fileName}.pdf`);
  };

  const handleDownloadModel = () => {
    if (!generatedModel) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(16);
    doc.text("Redação Modelo (Nota 1000)", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Tema: ${topic}`, 20, 35);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const splitText = doc.splitTextToSize(generatedModel, pageWidth - 40);
    doc.text(splitText, 20, 50);
    
    const fileName = window.prompt("Digite o nome do arquivo:", "redacao_modelo") || "redacao_modelo";
    doc.save(`${fileName}.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto w-full bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100"
    >
      <div className="p-8 md:p-10">
        <div className="flex items-center gap-4 mb-8">
            <button 
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
                <PenTool className="w-8 h-8 text-indigo-600" />
                Gerador de Redação
            </h2>
        </div>

        <div className="space-y-6">
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Tema da Redação</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => {
                            setTopic(e.target.value);
                            setGeneratedModel(null);
                        }}
                        placeholder="Digite um tema ou gere um aleatório..."
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <Button 
                        onClick={handleGenerateTopic} 
                        isLoading={isLoadingTopic}
                        variant="outline"
                        icon={<Sparkles className="w-4 h-4" />}
                        className="whitespace-nowrap"
                    >
                        Gerar Tema
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <Button 
                    onClick={handleDownloadSheet}
                    disabled={!topic.trim()}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 group"
                >
                    <FileText className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="font-medium text-slate-700 group-hover:text-indigo-700">Baixar Folha de Redação</span>
                    <span className="text-xs text-slate-400 font-normal">PDF com pauta de 30 linhas</span>
                </Button>

                <Button 
                    onClick={handleDownloadDraft}
                    disabled={!topic.trim()}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 group"
                >
                    <PenTool className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="font-medium text-slate-700 group-hover:text-indigo-700">Baixar Rascunhão</span>
                    <span className="text-xs text-slate-400 font-normal">Estrutura para planejamento</span>
                </Button>

                <Button 
                    onClick={handleGenerateModel}
                    disabled={!topic.trim() || isLoadingModel}
                    isLoading={isLoadingModel}
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 group relative overflow-hidden sm:col-span-2"
                >
                    <Sparkles className="w-8 h-8 text-indigo-200 group-hover:text-white transition-colors relative z-10" />
                    <span className="font-medium text-white relative z-10">Gerar Modelo Nota 1000</span>
                    <span className="text-xs text-indigo-200 font-normal relative z-10">Exemplo completo feito pela IA</span>
                    
                    {/* Background effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
            </div>

            {generatedModel && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 relative"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            Modelo Gerado
                        </h3>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleDownloadModel}
                            icon={<Download className="w-3 h-3" />}
                            className="text-xs h-8"
                        >
                            Baixar PDF
                        </Button>
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        {generatedModel}
                    </div>
                </motion.div>
            )}
        </div>
      </div>
    </motion.div>
  );
};
