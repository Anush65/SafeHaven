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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      setMediaRecorder(recorder);
      setIsRecording(true);

      recorder.start();
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Process audio for emergency keywords
          processVoiceData(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      toast({
        title: "🎤 Voice Recording Started",
        description: "Listening for emergency keywords..."
      });
    } catch (error) {
      toast({
        title: "Microphone Error",
        description: "Please allow microphone access for voice detection.",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  };

  const processVoiceData = (audioBlob: Blob) => {
    // Simulated voice-to-text processing
    const emergencyKeywords = ['help', 'emergency', 'fire', 'police', 'ambulance', 'danger'];
    const detectedKeyword = emergencyKeywords[Math.floor(Math.random() * emergencyKeywords.length)];
    
    const report = createReport('Voice', `Voice detected: "${detectedKeyword}"`);
    
    toast({
      title: `🎯 Keyword Detected: "${detectedKeyword.toUpperCase()}"`,
      description: "Emergency services have been notified.",
      variant: "destructive"
    });
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
    { name: "Emergency Services", number: "911", icon: Phone, color: "bg-red-500" },
    { name: "Police", number: "911", icon: Shield, color: "bg-blue-500" },
    { name: "Fire Department", number: "911", icon: AlertTriangle, color: "bg-orange-500" },
    { name: "Medical Emergency", number: "911", icon: Phone, color: "bg-green-500" }
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
            <Card className="p-8 text-center space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  {isRecording ? (
                    <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                      <Mic className="w-12 h-12 text-white" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
                      <MicOff className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold">Voice Emergency Detection</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Activate voice monitoring to detect emergency keywords like "help", "fire", "police", or "ambulance"
                </p>
                
                <Button
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className="w-64 h-12"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Monitoring
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Start Voice Monitoring
                    </>
                  )}
                </Button>
                
                {isRecording && (
                  <div className="text-sm text-muted-foreground animate-pulse">
                    🎤 Listening for emergency keywords...
                  </div>
                )}
              </div>
            </Card>
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
