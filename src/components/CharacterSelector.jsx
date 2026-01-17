import React from 'react';
import { User } from 'lucide-react';

const CharacterSelector = ({ characters, onSelect, onManage }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {characters.map(char => {
                const isBanned = char.OtakuN_N > 0;
                return (
                    <button
                        key={char.ID}
                        disabled={isBanned}
                        onClick={() => onSelect(char)}
                        className={`relative p-5 rounded-xl border text-left transition-all group
                            ${isBanned
                                ? 'bg-red-900/10 border-red-500/20 opacity-60 cursor-not-allowed'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-indigo-500/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10'
                            }`}
                    >
                        {isBanned && (
                            <span className="absolute top-3 right-3 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold shadow-sm">
                                BANEADO
                            </span>
                        )}
                        <div className="flex items-center gap-4 mb-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner
                                ${isBanned ? 'bg-gray-800 text-gray-500' : 'bg-indigo-600 text-white shadow-indigo-500/40 group-hover:scale-110 transition-transform'}`}>
                                {char.Nombre_Apellido.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-bold truncate max-w-[140px] text-sm ${isBanned ? 'text-gray-400 line-through' : 'text-white group-hover:text-indigo-300 transition-colors'}`}>
                                    {char.Nombre_Apellido.replace('_', ' ')}
                                </h3>
                                <p className="text-xs text-gray-500">Horas: {char.FugaoVicio || 0}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mt-2 pt-3 border-t border-white/5 group-hover:border-white/10 transition-colors">
                            <span className="bg-black/20 px-1.5 py-0.5 rounded">ID: {char.ID}</span>
                            <span className={char.MiembroFaccion > 0 ? "text-indigo-400" : ""}>{char.MiembroFaccion > 0 ? 'FACCIÓN' : 'CIVIL'}</span>
                        </div>
                    </button>
                );
            })}

            <button
                onClick={onManage}
                className="p-5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all gap-2 group min-h-[140px]"
            >
                <div className="p-3 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                    <User size={24} className="group-hover:text-indigo-400 transition-colors" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Gestionar Personajes</span>
            </button>
        </div>
    );
};

export default CharacterSelector;
