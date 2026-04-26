import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import api from '../utils/api';
import { PIPELINE_STAGES, STAGE_COLORS, STAGE_EMOJIS } from '../utils/constants';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { Mail, Briefcase, GripVertical } from 'lucide-react';

const PipelinePage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCandidates(); }, []);

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/candidates');
      setCandidates(res.data.data);
    } catch { toast.error('Failed to load pipeline'); }
    finally { setLoading(false); }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStage = destination.droppableId;
    // Optimistic update
    setCandidates(prev => prev.map(c => c._id === draggableId ? { ...c, currentStage: newStage } : c));

    try {
      await api.put(`/candidates/${draggableId}/stage`, { stage: newStage });
      toast.success(`Moved to ${newStage}`);
    } catch {
      // Revert on failure
      setCandidates(prev => prev.map(c => c._id === draggableId ? { ...c, currentStage: source.droppableId } : c));
      toast.error('Failed to update stage');
    }
  };

  const getColumnCandidates = (stage) => candidates.filter(c => c.currentStage === stage);

  if (loading) return <Layout><Loader size="lg" text="Loading pipeline..." /></Layout>;

  return (
    <Layout>
      <div className="fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-surface-900">Hiring Pipeline</h1>
          <p className="text-surface-500 text-sm mt-1">Drag candidates between stages</p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '70vh' }}>
            {PIPELINE_STAGES.map(stage => {
              const sc = STAGE_COLORS[stage];
              const items = getColumnCandidates(stage);
              return (
                <div key={stage} className="flex-shrink-0 w-[280px]">
                  <div className={`rounded-2xl border ${sc.border} bg-white overflow-hidden`}>
                    {/* Column header */}
                    <div className={`px-4 py-3 ${sc.bg} border-b ${sc.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{STAGE_EMOJIS[stage]}</span>
                          <h3 className={`text-sm font-bold ${sc.text}`}>{stage}</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {items.length}
                        </span>
                      </div>
                    </div>

                    {/* Droppable area */}
                    <Droppable droppableId={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-3 min-h-[200px] transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-primary-50/50' : 'bg-surface-50/30'}`}
                        >
                          <div className="space-y-2.5">
                            {items.map((candidate, index) => (
                              <Draggable key={candidate._id} draggableId={candidate._id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white rounded-xl p-3.5 border border-surface-100 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                                      snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105' : 'hover:shadow-md hover:border-surface-200'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <GripVertical size={14} className="text-surface-300 mt-0.5 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <div className="w-7 h-7 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-xs font-bold">{candidate.name?.charAt(0)?.toUpperCase()}</span>
                                          </div>
                                          <p className="text-sm font-semibold text-surface-800 truncate">{candidate.name}</p>
                                        </div>
                                        <div className="space-y-1 ml-9">
                                          <p className="flex items-center gap-1.5 text-xs text-surface-400 truncate">
                                            <Mail size={11} /> {candidate.email}
                                          </p>
                                          {candidate.jobId && (
                                            <p className="flex items-center gap-1.5 text-xs text-primary-500 font-medium truncate">
                                              <Briefcase size={11} /> {candidate.jobId.title}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                          {provided.placeholder}
                          {items.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-8">
                              <p className="text-xs text-surface-400">Drop candidates here</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </Layout>
  );
};

export default PipelinePage;
