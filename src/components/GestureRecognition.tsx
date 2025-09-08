import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Square, Volume2, Copy, Download, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GestureData {
  gesture: string;
  confidence: number;
  timestamp: Date;
  mode: 'alphabet' | 'word';
}

interface HandLandmarks {
  x: number;
  y: number;
}

const GestureRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCamera, setIsCamera] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [mode, setMode] = useState<'alphabet' | 'word'>('alphabet');
  const [history, setHistory] = useState<GestureData[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [handsInstance, setHandsInstance] = useState<any>(null);
  const { toast } = useToast();

  // Gesture mappings
  const alphabetGestures = {
    'thumb_up': 'A',
    'peace_sign': 'V',
    'pointing': 'I',
    'fist': 'B',
    'open_palm': 'STOP'
  };

  const wordGestures = {
    'thumb_up': 'YES',
    'peace_sign': 'PEACE', 
    'pointing': 'I',
    'fist': 'NO',
    'open_palm': 'HELP',
    'ok_sign': 'OK'
  };

  const getCurrentGestures = () => mode === 'alphabet' ? alphabetGestures : wordGestures;

  // Initialize MediaPipe Hands
  const initializeHands = useCallback(async () => {
    try {
      const { Hands } = await import('@mediapipe/hands');
      
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      hands.onResults(onResults);
      setHandsInstance(hands);
      
      return hands;
    } catch (error) {
      console.error('Failed to initialize MediaPipe Hands:', error);
      toast({
        title: "Camera Error",
        description: "Failed to initialize gesture recognition.",
        variant: "destructive"
      });
    }
  }, []);

  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawLandmarks(ctx, landmarks);
        const gesture = recognizeGesture(landmarks);
        if (gesture) {
          const gestureText = getCurrentGestures()[gesture.type as keyof typeof alphabetGestures];
          if (gestureText && gesture.confidence > 0.7) {
            setCurrentText(gestureText);
            setConfidence(gesture.confidence);
            
            // Add to history
            const newGestureData: GestureData = {
              gesture: gestureText,
              confidence: gesture.confidence,
              timestamp: new Date(),
              mode
            };
            
            setHistory(prev => {
              // Avoid duplicates within 1 second
              const lastEntry = prev[prev.length - 1];
              if (lastEntry && 
                  lastEntry.gesture === gestureText && 
                  new Date().getTime() - lastEntry.timestamp.getTime() < 1000) {
                return prev;
              }
              return [...prev, newGestureData];
            });
          }
        }
      }
    }
  }, [mode, getCurrentGestures]);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: HandLandmarks[]) => {
    // Draw hand landmarks
    ctx.fillStyle = 'hsl(var(--gesture-active))';
    ctx.strokeStyle = 'hsl(var(--gesture-active))';
    ctx.lineWidth = 2;

    // Draw points
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * ctx.canvas.width;
      const y = landmark.y * ctx.canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw connections between landmarks
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],  // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],  // Ring
      [0, 17], [17, 18], [18, 19], [19, 20],  // Pinky
    ];

    ctx.beginPath();
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      if (startPoint && endPoint) {
        ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
        ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
      }
    });
    ctx.stroke();
  };

  const recognizeGesture = (landmarks: HandLandmarks[]) => {
    if (!landmarks || landmarks.length < 21) return null;

    // Get key landmark points
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const middleMcp = landmarks[9];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const ringMcp = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];
    const pinkyMcp = landmarks[17];

    // Helper function to check if finger is extended
    const isFingerExtended = (tip: HandLandmarks, pip: HandLandmarks, mcp: HandLandmarks) => {
      const tipToPip = Math.sqrt(Math.pow(tip.x - pip.x, 2) + Math.pow(tip.y - pip.y, 2));
      const pipToMcp = Math.sqrt(Math.pow(pip.x - mcp.x, 2) + Math.pow(pip.y - mcp.y, 2));
      const tipToMcp = Math.sqrt(Math.pow(tip.x - mcp.x, 2) + Math.pow(tip.y - mcp.y, 2));
      
      // If tip is further from mcp than pip, finger is likely extended
      return tipToMcp > (tipToPip + pipToMcp) * 0.8;
    };

    // Check thumb extension (different logic due to thumb orientation)
    const isThumbExtended = () => {
      const thumbToWrist = Math.sqrt(Math.pow(thumbTip.x - wrist.x, 2) + Math.pow(thumbTip.y - wrist.y, 2));
      const thumbMcpToWrist = Math.sqrt(Math.pow(thumbMcp.x - wrist.x, 2) + Math.pow(thumbMcp.y - wrist.y, 2));
      return thumbToWrist > thumbMcpToWrist * 1.2;
    };

    // Determine finger states
    const thumbExtended = isThumbExtended();
    const indexExtended = isFingerExtended(indexTip, indexPip, indexMcp);
    const middleExtended = isFingerExtended(middleTip, middlePip, middleMcp);
    const ringExtended = isFingerExtended(ringTip, ringPip, ringMcp);
    const pinkyExtended = isFingerExtended(pinkyTip, pinkyPip, pinkyMcp);

    // Count extended fingers for confidence calculation
    const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    let gestureType = '';
    let confidence = 0.7;

    // Gesture recognition patterns
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gestureType = 'thumb_up';
      confidence = 0.9;
    } else if (!thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      gestureType = 'peace_sign';
      confidence = 0.9;
    } else if (!thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gestureType = 'pointing';
      confidence = 0.85;
    } else if (!thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gestureType = 'fist';
      confidence = 0.9;
    } else if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
      gestureType = 'open_palm';
      confidence = 0.8;
    } else if (thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gestureType = 'ok_sign';
      confidence = 0.8;
    }

    // Adjust confidence based on gesture clarity
    if (gestureType) {
      // Bonus for clear gestures (specific finger count)
      if (extendedCount === 1 || extendedCount === 2 || extendedCount === 5) {
        confidence += 0.05;
      }
      
      // Calculate hand stability (less movement = higher confidence)
      const palmCenter = {
        x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
        y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4
      };
      
      const handSize = Math.sqrt(Math.pow(wrist.x - palmCenter.x, 2) + Math.pow(wrist.y - palmCenter.y, 2));
      if (handSize > 0.15 && handSize < 0.4) {
        confidence += 0.05; // Good hand distance from camera
      }
      
      confidence = Math.min(confidence, 0.95); // Cap at 95%
    }

    return gestureType ? { type: gestureType, confidence } : null;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCamera(true);
        
        // Initialize hands after camera starts
        const hands = await initializeHands();
        if (hands && videoRef.current) {
          const camera = new (await import('@mediapipe/camera_utils')).Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current) {
                await hands.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480
          });
          camera.start();
        }
      }
      
      toast({
        title: "Camera Started",
        description: "Hand gesture recognition is now active!"
      });
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera Error", 
        description: "Please allow camera access for gesture recognition.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCamera(false);
    setCurrentText('');
    setConfidence(0);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = history.map(h => h.gesture).join(' ');
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied",
      description: "Gesture history copied to clipboard!"
    });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `gesture-history-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Exported",
      description: "Gesture history exported successfully!"
    });
  };

  const clearHistory = () => {
    setHistory([]);
    setCurrentText('');
    toast({
      title: "Cleared",
      description: "Gesture history has been cleared."
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Hand Gesture Recognition
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Use your hands to communicate! Switch between alphabet mode (A-Z letters) and word mode (common phrases).
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          variant={mode === 'alphabet' ? 'default' : 'outline'}
          onClick={() => setMode('alphabet')}
          className="min-w-24"
        >
          A-Z Mode
        </Button>
        <Button
          variant={mode === 'word' ? 'default' : 'outline'}
          onClick={() => setMode('word')}
          className="min-w-24"
        >
          Word Mode
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera Feed
            </h3>
            <div className="flex gap-2">
              <Button
                variant={isCamera ? 'destructive' : 'default'}
                onClick={isCamera ? stopCamera : startCamera}
                size="sm"
              >
                {isCamera ? <Square className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {isCamera ? 'Stop' : 'Start'}
              </Button>
            </div>
          </div>

          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute top-0 left-0 w-full h-full"
            />
            
            {!isCamera && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white text-lg">Camera not started</p>
              </div>
            )}

            {isCamera && (
              <div className="absolute top-4 left-4 space-y-2">
                <Badge variant="secondary" className="bg-black/50 text-white">
                  Mode: {mode.toUpperCase()}
                </Badge>
                {confidence > 0 && (
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    Confidence: {Math.round(confidence * 100)}%
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Gesture Guide */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {Object.entries(getCurrentGestures()).map(([gesture, text]) => (
              <div key={gesture} className="text-center p-2 bg-muted rounded">
                <div className="font-medium">{text}</div>
                <div className="text-muted-foreground">{gesture.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Output Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recognized Text</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => speakText(currentText)}
                disabled={!currentText}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                disabled={history.length === 0}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={history.length === 0}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Current Recognition */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border">
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-primary mb-2">
                {currentText || 'Show a gesture...'}
              </div>
              {confidence > 0 && (
                <div className="text-sm text-muted-foreground">
                  Confidence: {Math.round(confidence * 100)}%
                </div>
              )}
            </div>
          </div>

          {/* History Panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">History ({history.length})</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-1">
              {history.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No gestures recognized yet
                </p>
              ) : (
                history.slice(-10).reverse().map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span className="font-mono font-medium">{item.gesture}</span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {item.mode}
                      </Badge>
                      <span>{Math.round(item.confidence * 100)}%</span>
                      <span>{item.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Statistics */}
          {history.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-muted rounded">
                <div className="text-lg font-bold">{history.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-lg font-bold">
                  {Math.round((history.reduce((sum, h) => sum + h.confidence, 0) / history.length) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-lg font-bold">
                  {new Set(history.map(h => h.gesture)).size}
                </div>
                <div className="text-xs text-muted-foreground">Unique</div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GestureRecognition;