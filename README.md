# SafeHaven 

Voice & Gesture Emergency Reporting System

**SafeHaven** is an inclusive, offline-first web application designed to empower individuals to report emergencies instantly, overcoming barriers of language, literacy, and ability. It enables reporting through intuitive voice commands and real-time American Sign Language (ASL) fingerspelling recognition, ensuring help is accessible to everyone.

**Built for a 18-Hour Hackathon**

## Features

-   **Multi-Modal Reporting**: Choose the method that works for you.
    -   **Voice Input**: Speak your emergency. The app transcribes your speech and detects critical keywords to trigger the appropriate response.
    -   **Gesture Input**: Use your webcam to fingerspell words in ASL (A-Z). The app recognizes letters in real-time to form your message (e.g., "H-E-L-P").
-   **SOS with Location**: With one click, simulate sending your GPS coordinates to emergency contacts. *(Note: Full SMS functionality requires a backend service like Twilio).*
-   **Offline-First Design**: Core functionality remains available even without an internet connection. The AI model and app shell are cached for offline use.
-   **Instant Guidance**: Automatically displays relevant local emergency helpline numbers and resources based on the content of your report.
-   **Accessible & Inclusive**: Designed with a11y best practices to serve users with diverse abilities and needs.

## 🛠️ Tech Stack

-   **Frontend Framework**: React 18 + TypeScript
-   **Build Tool**: Vite
-   **AI/ML**: TensorFlow.js for in-browser gesture recognition
-   **Voice Processing**: Web Speech API
-   **Styling**: Tailwind CSS
-   **Icons**: Lucide React
-   **Offline Capability**: Vite PWA Plugin (Service Worker)

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/YOUR_USERNAME/SafeHaven.git
    cd SafeHaven
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```
4.  **Open your browser** and navigate to the local address shown in the terminal (usually `http://localhost:5173`).

### Building for Production

```bash
npm run build
