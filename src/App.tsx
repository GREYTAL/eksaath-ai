import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { GoogleGenAI } from "@google/genai";
import { 
  Send, 
  Users, 
  MessageSquare, 
  Sparkles, 
  LogOut, 
  Plus, 
  Hash,
  BookOpen,
  BrainCircuit,
  User as UserIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  isAI?: boolean;
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userName, setUserName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTypingAI, setIsTypingAI] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("group-data", ({ messages, users }) => {
      setMessages(messages);
      setUsers(users);
    });

    socket.on("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("user-joined", (userName: string) => {
      setUsers((prev) => [...new Set([...prev, userName])]);
    });

    return () => {
      socket.off("group-data");
      socket.off("new-message");
      socket.off("user-joined");
    };
  }, [socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleJoin = () => {
    if (userName && groupId && socket) {
      socket.emit("join-group", { groupId, userName });
      setIsJoined(true);
    }
  };

  const sendMessage = async (e?: any) => {
    e?.preventDefault();
    if (!inputText.trim() || !socket) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      sender: userName,
      timestamp: Date.now(),
    };

    socket.emit("send-message", { groupId, message: userMessage });
    setInputText("");

    // Check if AI should respond (e.g., if message mentions "ai" or starts with "@ai")
    if (inputText.toLowerCase().includes("@ai") || inputText.toLowerCase().includes("ai help")) {
      handleAIResponse(inputText);
    }
  };

  const handleAIResponse = async (prompt: string) => {
    setIsTypingAI(true);
    try {
      const cleanPrompt = prompt.replace(/@ai/gi, "").trim();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `Context: This is a study group chat. Help the students with their query: ${cleanPrompt}` }]
          }
        ],
        config: {
          systemInstruction: "You are a helpful study assistant in a group chat. Keep responses concise, educational, and encouraging. Use markdown for formatting."
        }
      });

      const aiMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        text: response.text || "I'm sorry, I couldn't process that.",
        sender: "Gemini AI",
        timestamp: Date.now(),
        isAI: true,
      };

      socket?.emit("send-message", { groupId, message: aiMessage });
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsTypingAI(false);
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1 text-center pb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
                  <BrainCircuit className="text-white w-10 h-10" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight text-white">Study Sandbox</CardTitle>
              <p className="text-zinc-400 text-sm">Collaborative AI-powered learning space</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Your Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input 
                    placeholder="e.g. Alex" 
                    className="bg-zinc-950/50 border-zinc-800 pl-10 focus:ring-indigo-500/50 text-white"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Study Group ID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input 
                    placeholder="e.g. exam-prep-2024" 
                    className="bg-zinc-950/50 border-zinc-800 pl-10 focus:ring-indigo-500/50 text-white"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-12 mt-4 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                onClick={handleJoin}
                disabled={!userName || !groupId}
              >
                Enter Sandbox
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col font-sans text-zinc-100 overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BrainCircuit className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">Study Sandbox</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-zinc-700 text-zinc-400 font-mono">
                #{groupId}
              </Badge>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {users.length} online
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex -space-x-2">
            {users.slice(0, 3).map((u, i) => (
              <Avatar key={i} className="w-8 h-8 border-2 border-zinc-900 ring-1 ring-zinc-800">
                <AvatarFallback className="bg-zinc-800 text-[10px] font-bold">{u[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            {users.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold z-10">
                +{users.length - 3}
              </div>
            )}
          </div>
          <Separator orientation="vertical" className="h-6 bg-zinc-800" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={() => setIsJoined(false)}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex w-64 border-r border-zinc-800 flex-col bg-zinc-900/10">
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-2">Collaborators</h3>
              <div className="space-y-1">
                {users.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors group">
                    <div className="relative">
                      <Avatar className="w-7 h-7 ring-1 ring-zinc-700">
                        <AvatarFallback className="bg-zinc-800 text-[10px]">{u[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                    </div>
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white truncate">{u === userName ? "You" : u}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-zinc-800/50" />

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-2">Quick Actions</h3>
              <div className="grid gap-2">
                <Button variant="outline" className="justify-start gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-xs h-9">
                  <BookOpen className="w-3.5 h-3.5" />
                  Shared Notes
                </Button>
                <Button variant="outline" className="justify-start gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-xs h-9">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Summary
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-auto p-4">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
              <p className="text-[10px] text-indigo-300 font-medium leading-relaxed">
                Tip: Mention <span className="text-white font-bold">@ai</span> to get help from Gemini with your study questions.
              </p>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-zinc-950/20 relative">
          <ScrollArea className="flex-1 px-4 py-6" viewportRef={scrollRef}>
            <div className="max-w-3xl mx-auto space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex gap-3",
                      msg.sender === userName ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className={cn(
                      "w-8 h-8 shrink-0 ring-1 ring-zinc-800",
                      msg.isAI ? "bg-indigo-600" : "bg-zinc-800"
                    )}>
                      {msg.isAI ? (
                        <Sparkles className="w-4 h-4 text-white" />
                      ) : (
                        <AvatarFallback className="text-[10px] font-bold">{msg.sender[0].toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.sender === userName ? "items-end" : "items-start"
                    )}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          {msg.sender === userName ? "You" : msg.sender}
                        </span>
                        <span className="text-[9px] text-zinc-600">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                        msg.sender === userName 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : msg.isAI 
                            ? "bg-zinc-900 border border-indigo-500/30 text-zinc-100 rounded-tl-none"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTypingAI && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <Avatar className="w-8 h-8 bg-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  </Avatar>
                  <div className="bg-zinc-900 border border-indigo-500/30 px-4 py-2.5 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 backdrop-blur-md shrink-0">
            <form 
              onSubmit={sendMessage}
              className="max-w-3xl mx-auto relative flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Input 
                  placeholder="Ask a question or type @ai for help..."
                  className="bg-zinc-950/50 border-zinc-800 h-12 pr-12 focus:ring-indigo-500/50 text-white rounded-xl"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-zinc-700 text-zinc-500 hidden sm:flex">
                    Enter to send
                  </Badge>
                </div>
              </div>
              <Button 
                type="submit"
                size="icon"
                className="h-12 w-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/10 shrink-0 transition-transform active:scale-90"
                disabled={!inputText.trim()}
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
            <p className="text-[10px] text-center text-zinc-600 mt-2">
              Collaborative AI Sandbox • Powered by Gemini 3 Flash
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
