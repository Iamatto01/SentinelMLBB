import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { processScreenshotOCR } from '../utils/ocrParser';
import { useData } from '../contexts/DataContext';

const OCRUploadPage = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { addGame } = useData();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type.startsWith('image/')) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
    }
  };

  const processImage = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const parsedData = await processScreenshotOCR(file);
      setResult(parsedData);
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePairChange = (index, field, value) => {
    if (!result) return;
    const updatedPairs = [...result.pairs];
    updatedPairs[index] = { ...updatedPairs[index], [field]: value };
    setResult({ ...result, pairs: updatedPairs });
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      await addGame(result);
      navigate('/log');
    } catch (error) {
      console.error(error);
      alert("Error saving game log: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-outfit mb-1">OCR Upload</h2>
        <p className="text-gray-400">Upload a post-game scoreboard screenshot to automatically extract data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card space-y-6">
          <h3 className="text-xl font-bold font-outfit">1. Select Screenshot</h3>
          
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              preview ? 'border-accent bg-accent/5' : 'border-gray-600 hover:border-gray-400 hover:bg-bg3'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="space-y-4">
                <div className="text-5xl">📸</div>
                <p className="text-gray-400">Click to browse or drag and drop an image here</p>
              </div>
            )}
          </div>

          <button 
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={processImage}
            disabled={!file || isProcessing}
          >
            {isProcessing ? 'Processing OCR...' : 'Process Image'}
          </button>
        </div>

        <div className="card space-y-6">
          <h3 className="text-xl font-bold font-outfit">2. Review & Save</h3>
          
          {isProcessing ? (
             <div className="h-64 flex flex-col items-center justify-center space-y-4 text-gray-400">
               <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
               <p>Extracting text and identifying heroes...</p>
             </div>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center bg-bg3 p-3 rounded-lg">
                <span className="text-gray-400">Mode</span>
                <input 
                  type="text" 
                  value={result.mode} 
                  onChange={e => setResult({...result, mode: e.target.value})}
                  className="bg-transparent text-right font-bold focus:outline-none w-24"
                />
              </div>
              <div className="flex justify-between items-center bg-bg3 p-3 rounded-lg">
                <span className="text-gray-400">Result</span>
                <select 
                  value={result.result} 
                  onChange={e => setResult({...result, result: e.target.value})}
                  className={`bg-transparent text-right font-bold focus:outline-none ${result.result === 'Win' ? 'text-win' : 'text-lose'}`}
                >
                  <option value="Win" className="text-win bg-bg3">Win</option>
                  <option value="Lose" className="text-lose bg-bg3">Lose</option>
                </select>
              </div>
              <div className="flex justify-between items-center bg-bg3 p-3 rounded-lg">
                <span className="text-gray-400">Duration (mins)</span>
                <input 
                  type="number" 
                  value={result.duration} 
                  onChange={e => setResult({...result, duration: Number(e.target.value)})}
                  className="bg-transparent text-right font-bold focus:outline-none w-16"
                />
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-2 mt-4">Detected Lineup</h4>
                <div className="space-y-2">
                  {result.pairs.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input 
                        type="text" 
                        value={p.player} 
                        onChange={e => handlePairChange(i, 'player', e.target.value)}
                        placeholder={`Player ${i+1}`} 
                        className="input-field py-1 text-sm flex-1" 
                      />
                      <input 
                        type="text" 
                        value={p.hero} 
                        onChange={e => handlePairChange(i, 'hero', e.target.value)}
                        placeholder="Hero" 
                        className="input-field py-1 text-sm flex-1" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary w-full mt-4 bg-win hover:bg-green-600 hover:shadow-[0_0_15px_rgba(46,204,113,0.6)] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save to Game Log'}
              </button>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
              Results will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRUploadPage;
