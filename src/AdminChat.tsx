// AdminChat.tsx

import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebaseConfig";
import { ref, push, onValue, set } from "firebase/database";

interface Message {
  id: string;
  text: string;
  author?: string;
}

interface Session {
  id: string;
}

const AdminChat: React.FC = () => {
  const [inputText, setInputText] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // チャットウィンドウを開く/閉じる関数
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen && messages.length === 0) {
      setTimeout(scrollToBottom, 100); // 少し遅延を入れてDOMの更新を待つ
    }
  };

  // 新しいメッセージが追加されたときに自動スクロールする関数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // セッションのリストを取得
  useEffect(() => {
    const sessionsRef = ref(db, "sessions");
    onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedSessions = data
        ? Object.keys(data).map((key) => ({
            id: key,
          }))
        : [];
      setSessions(loadedSessions);
    });
  }, []);

  // 選択されたセッションのメッセージを取得
  useEffect(() => {
    if (selectedSessionId) {
      const messagesRef = ref(db, `messages/${selectedSessionId}`);
      onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        const loadedMessages = data
          ? Object.keys(data).map((key) => ({
              ...data[key],
              id: key,
            }))
          : [];
        setMessages(loadedMessages);
      });
    }
  }, [selectedSessionId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && event.shiftKey) {
      // shiftキーが押されていないときのみ反応
      event.preventDefault(); // フォームのデフォルトの送信を防ぐ
      handleUserInput(inputText); // メッセージ送信関数を呼び出す
      setInputText(""); // 入力フィールドをクリア
    }
  };

  // ユーザーの入力を処理する
  const handleUserInput = (input: string) => {
    sendMessage(input, "admin");
  };

  const sendMessage = (textLines: string | string[], author: string) => {
    const text = Array.isArray(textLines) ? textLines.join("\n") : textLines;
    const newMessageRef = push(ref(db, `messages/${selectedSessionId}`)); // `selectedSessionId`を使用
    set(newMessageRef, {
      text: text,
      author: author,
      timestamp: new Date().toISOString(),
    })
      .then(() => {
        setInputText(""); // メッセージ送信後、入力欄をクリア
      })
      .catch((error) => {
        console.error("SendMessage Error:", error); // エラーのロギング
      });
  };

  return (
    <div>
      <select
        onChange={(e) => setSelectedSessionId(e.target.value)}
        value={selectedSessionId}
      >
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.id}
          </option>
        ))}
      </select>
      <div className="chat-window fixed bottom-0 right-0 w-full max-w-sm h-1/2 bg-white shadow-lg flex flex-col">
        <button
          onClick={toggleChat}
          className="absolute top-[-30px] left-[-20px] m-2 bg-red-500 text-white p-2 rounded hover:bg-red-700 transition duration-200 z-50"
        >
          ☓
        </button>
        <div className="flex flex-col overflow-y-auto h-full w-full pt-4 pb-4 px-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg text-white mt-2 mb-2 break-words ${
                message.author === "admin"
                  ? "ml-auto bg-blue-500"
                  : "mr-auto bg-gray-300 text-black"
              } max-w-3/4`}
            >
              {message.text.split("\n").map((line, idx) => (
                <div key={idx}>{line}</div> // 改行を <div> で表現
              ))}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-2 border-t border-gray-200">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 border border-gray-400"
            placeholder="リセットしたい場合escキーを押してください"
          />
          <button
            onClick={() => handleUserInput(inputText)}
            className="bg-blue-500 text-white p-2 mt-2 rounded hover:bg-blue-700 transition duration-200 w-full"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
