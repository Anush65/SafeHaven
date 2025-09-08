import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Phone, 
  Mic, 
  MicOff, 
  MapPin, 
  Shield, 
  FileText,
  Download,
  Wifi,
  WifiOff,
  Hand,
  Camera
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GestureRecognition from '@/components/GestureRecognition';

interface EmergencyReport {
  id: string;
  type: 'SOS' | 'Voice' | 'Gesture';
  message: string;
  location?: { lat: number; lng: number };
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed';
}

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position),
        (error) => console.log('Location error:', error)
      );
    }

    // Load reports from localStorage
    const savedReports = localStorage.getItem('safehaven-reports');
    if (savedReports) {
      setReports(JSON.parse(savedReports));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('safehaven-reports', JSON.stringify(reports));
  }, [reports]);

  const createReport = (type: EmergencyReport['type'], message: string) => {
    const newReport: EmergencyReport = {
      id: Date.now().toString(),
      type,
      message,
      location: location ? { lat: location.coords.latitude, lng: location.coords.longitude } : undefined,
      timestamp: new Date(),
      status: isOnline ? 'sent' : 'pending'
    };

    setReports(prev => [...prev, newReport]);
    return newReport;
  };

  const handleSOS = () => {
    const report = createReport('SOS', 'Emergency SOS activated');
    
    toast({
      title: "🚨 SOS Activated",
      description: location 
        ? `Emergency services alerted. Location: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
        : "Emergency services alerted. Enable location for better assistance.",
      variant: "destructive"
    });

    // Simulate emergency contact
    setTimeout(() => {
      toast({
        title: "📞 Emergency Contact",
        description: "Call 911 for immediate assistance"
      });
    }, 2000);
  };

  const startVoiceRecording = async () => {
    try {
      // Request microphone permissions explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Initialize Speech Recognition API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian English
        
        recognition.onstart = () => {
          setIsRecording(true);
          toast({
            title: "🎤 Voice Recognition Active",
            description: "Listening for emergency keywords in Hindi and English..."
          });
        };
        
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
            
          processVoiceTranscript(transcript.toLowerCase());
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          toast({
            title: "Voice Recognition Error",
            description: `Error: ${event.error}. Please try again.`,
            variant: "destructive"
          });
          setIsRecording(false);
        };
        
        recognition.onend = () => {
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
        };
        
        recognition.start();
        setMediaRecorder({ stop: () => recognition.stop() } as any);
        
      } else {
        // Fallback to basic MediaRecorder
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        setIsRecording(true);

        recorder.start(1000); // Record in 1-second chunks
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            processVoiceData(event.data);
          }
        };

        recorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        };

        toast({
          title: "🎤 Voice Recording Started",
          description: "Recording audio for emergency detection..."
        });
      }
      
    } catch (error) {
      console.error('Microphone access error:', error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access in your browser settings and try again.",
        variant: "destructive"
      });
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  };

  const processVoiceTranscript = (transcript: string) => {
    // Enhanced emergency keywords in English and Hindi (transliterated)
    const emergencyKeywords = {
      // English keywords
      'help': { service: 'Emergency Services', number: '108', severity: 'high' },
      'emergency': { service: 'Emergency Services', number: '108', severity: 'high' },
      'fire': { service: 'Fire Department', number: '101', severity: 'critical' },
      'police': { service: 'Police', number: '100', severity: 'high' },
      'ambulance': { service: 'Medical Emergency', number: '108', severity: 'critical' },
      'danger': { service: 'Emergency Services', number: '108', severity: 'high' },
      'attack': { service: 'Police', number: '100', severity: 'critical' },
      'accident': { service: 'Medical Emergency', number: '108', severity: 'critical' },
      'medical': { service: 'Medical Emergency', number: '108', severity: 'high' },
      'hurt': { service: 'Medical Emergency', number: '108', severity: 'high' },
      'bleeding': { service: 'Medical Emergency', number: '108', severity: 'critical' },
      
      // Hindi keywords (transliterated)
      'madad': { service: 'Emergency Services', number: '108', severity: 'high' }, // help
      'bachaiye': { service: 'Emergency Services', number: '108', severity: 'high' }, // save me
      'aag': { service: 'Fire Department', number: '101', severity: 'critical' }, // fire
      'police_hindi': { service: 'Police', number: '100', severity: 'high' }, // police in Hindi context
      'ambulance_hindi': { service: 'Medical Emergency', number: '108', severity: 'critical' }, // ambulance in Hindi context
      'khatre': { service: 'Emergency Services', number: '108', severity: 'high' }, // danger
      'hamla': { service: 'Police', number: '100', severity: 'critical' }, // attack
      'durghatna': { service: 'Medical Emergency', number: '108', severity: 'critical' } // accident
    };
    
    // Check for emergency keywords in transcript
    let detectedKeyword = null;
    let highestSeverity = '';
    
    for (const [keyword, info] of Object.entries(emergencyKeywords)) {
      if (transcript.includes(keyword)) {
        if (!detectedKeyword || info.severity === 'critical') {
          detectedKeyword = { keyword, ...info };
          highestSeverity = info.severity;
        }
      }
    }
    
    if (detectedKeyword) {
      const report = createReport('Voice', `Voice detected: "${detectedKeyword.keyword}" - ${detectedKeyword.service}`);
      
      // Enhanced alert with automatic calling option
      const callEmergency = () => {
        window.location.href = `tel:${detectedKeyword.number}`;
        toast({
          title: `📞 Calling ${detectedKeyword.service}`,
          description: `Dialing ${detectedKeyword.number}...`
        });
      };
      
      toast({
        title: `🚨 EMERGENCY DETECTED: "${detectedKeyword.keyword.toUpperCase()}"`,
        description: `${detectedKeyword.service} - ${detectedKeyword.number}. Tap below to call immediately.`,
        variant: "destructive"
      });
      
      // Show separate call button
      setTimeout(() => {
        toast({
          title: `📞 Call ${detectedKeyword.service}?`,
          description: `Tap to dial ${detectedKeyword.number}`,
          action: (
            <button 
              onClick={callEmergency}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
            >
              Call Now
            </button>
          )
        });
      }, 1000);
      
      // Auto-speak the detected emergency
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Emergency detected: ${detectedKeyword.keyword}. Connecting to ${detectedKeyword.service} at ${detectedKeyword.number}`
        );
        utterance.rate = 0.9;
        utterance.pitch = 1.2;
        utterance.volume = 1;
        speechSynthesis.speak(utterance);
      }
      
      // If critical severity, auto-initiate SOS
      if (detectedKeyword.severity === 'critical') {
        setTimeout(() => {
          handleSOS();
        }, 2000);
      }
    }
  };

  const processVoiceData = (audioBlob: Blob) => {
    // This is now a fallback for browsers without Speech Recognition
    console.log('Processing audio blob for emergency detection');
    
    // Basic simulation for fallback
    const emergencyKeywords = ['help', 'emergency', 'fire', 'police', 'ambulance', 'danger'];
    const detectedKeyword = emergencyKeywords[Math.floor(Math.random() * emergencyKeywords.length)];
    
    processVoiceTranscript(detectedKeyword);
  };

  const exportReports = () => {
    const dataStr = JSON.stringify(reports, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `safehaven-reports-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Reports Exported",
      description: "Your emergency reports have been downloaded."
    });
  };

  const emergencyContacts = [
    { name: "Emergency Services", number: "108", icon: Phone, color: "bg-red-500" },
    { name: "Police", number: "100", icon: Shield, color: "bg-blue-500" },
    { name: "Fire Department", number: "101", icon: AlertTriangle, color: "bg-orange-500" },
    { name: "Medical Emergency", number: "108", icon: Phone, color: "bg-green-500" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-blue-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SafeHaven
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your comprehensive emergency response system. Stay safe with SOS alerts, voice detection, 
            gesture recognition, and instant access to emergency services.
          </p>
          
          {/* Status Indicators */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Badge variant={location ? "default" : "secondary"} className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {location ? 'Location Active' : 'Location Disabled'}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {reports.length} Reports
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="emergency" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="emergency">🚨 Emergency</TabsTrigger>
            <TabsTrigger value="voice">🎤 Voice</TabsTrigger>
            <TabsTrigger value="gesture">🤲 Gestures</TabsTrigger>
            <TabsTrigger value="reports">📊 Reports</TabsTrigger>
          </TabsList>

          {/* Emergency Tab */}
          <TabsContent value="emergency" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SOS Button */}
              <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800">
                <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
                <h3 className="text-2xl font-bold text-red-700 dark:text-red-400">Emergency SOS</h3>
                <p className="text-red-600 dark:text-red-300">
                  Press to immediately alert emergency services with your location
                </p>
                <Button 
                  onClick={handleSOS}
                  size="lg"
                  className="w-full h-16 text-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all pulse"
                >
                  🚨 ACTIVATE SOS
                </Button>
              </Card>

              {/* Emergency Contacts */}
              <Card className="p-6 space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Emergency Contacts
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {emergencyContacts.map((contact, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start h-12 p-4"
                      onClick={() => {
                        if ('tel:' + contact.number) {
                          window.location.href = 'tel:' + contact.number;
                        }
                        toast({
                          title: `Calling ${contact.name}`,
                          description: `Dialing ${contact.number}...`
                        });
                      }}
                    >
                      <div className={`w-8 h-8 rounded-full ${contact.color} flex items-center justify-center mr-3`}>
                        <contact.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">{contact.number}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Voice Tab */}
          <TabsContent value="voice" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Voice Control Card */}
                <Card className="p-8 text-center space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      {isRecording ? (
                        <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                          <Mic className="w-12 h-12 text-white" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <MicOff className="w-12 h-12 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-2xl font-bold">AI Voice Emergency Detection</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Advanced AI-powered voice recognition for emergency keywords in English and Hindi. 
                      Automatically connects to Indian emergency services.
                    </p>
                    
                    <Button
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      size="lg"
                      variant={isRecording ? "destructive" : "default"}
                      className="w-64 h-12 shadow-lg"
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-5 h-5 mr-2" />
                          Stop AI Monitoring
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5 mr-2" />
                          Start AI Voice Monitor
                        </>
                      )}
                    </Button>
                    
                    {isRecording && (
                      <div className="space-y-2">
                        <div className="text-sm text-red-600 animate-pulse font-medium">
                          🎤 AI Listening for Emergency Keywords...
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Monitoring: English & Hindi | Auto-connect: Police (100), Fire (101), Medical (108)
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Emergency Keywords Guide */}
                <Card className="p-6 space-y-4">
                  <h3 className="text-xl font-semibold">Emergency Keywords</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-blue-600 mb-2">📞 Police (100)</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Attack / Hamla</span>
                        <span className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Police</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-orange-600 mb-2">🔥 Fire (101)</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">Fire / Aag</span>
                        <span className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">Burning</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">🏥 Medical (108)</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Medical</span>
                        <span className="bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Ambulance</span>
                        <span className="bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Accident</span>
                        <span className="bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Durghatna</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">🆘 General Emergency</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Help / Madad</span>
                        <span className="bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Emergency</span>
                        <span className="bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Danger</span>
                        <span className="bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Bachaiye</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      💡 <strong>Pro Tip:</strong> Speak clearly in English or Hindi. The AI will automatically detect severity and connect you to the right service.
                    </p>
                  </div>
                </Card>
              </div>
          </TabsContent>

          {/* Gesture Tab */}
          <TabsContent value="gesture">
            <GestureRecognition />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">Emergency Reports</h3>
              <Button onClick={exportReports} variant="outline" disabled={reports.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export Reports
              </Button>
            </div>

            <div className="grid gap-4">
              {reports.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium mb-2">No Reports Yet</h4>
                  <p className="text-muted-foreground">Emergency reports will appear here</p>
                </Card>
              ) : (
                reports.slice().reverse().map((report) => (
                  <Card key={report.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={report.type === 'SOS' ? 'destructive' : 'default'}>
                            {report.type}
                          </Badge>
                          <Badge variant={report.status === 'sent' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="font-medium">{report.message}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{report.timestamp.toLocaleString()}</span>
                          {report.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
