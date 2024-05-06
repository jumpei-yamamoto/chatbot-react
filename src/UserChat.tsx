import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebaseConfig";
import { ref, push, onValue, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";

// メッセージの型を定義
interface Message {
  id: string;
  text: string;
  author: string;
  options?: string[];
}

function App() {
  const [inputText, setInputText] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [nextQuestion, setNextQuestion] = useState<string>("");
  const [chatWithSupport, setChatWithSupport] = useState(false);
  const [chatWithAI, setChatWithAI] = useState(false);
  const [sessionId, setSessionId] = useState("");

  // チャットウィンドウを開く/閉じる関数
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen && messages.length === 0) {
      // チャットが開かれ、メッセージがまだない場合に初回メッセージを送信
      sendInitialMessage();
      setTimeout(scrollToBottom, 100); // 少し遅延を入れてDOMの更新を待つ
    }
  };

  // セッションIDを取得または生成
  useEffect(() => {
    let currentSessionId = localStorage.getItem("chatSessionId");
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      localStorage.setItem("chatSessionId", currentSessionId);
      setSessionId(currentSessionId);
    } else {
      setSessionId(currentSessionId);
    }
  }, []);

  // 初回メッセージの送信
  const sendInitialMessage = () => {
    const messageText = [
      "こんにちは！相談内容を選択してください。",
      "1. どんな会社？",
      "2. 仕事を依頼したい",
      "3. その他",
    ];
    sendMessage(messageText, "bot");
  };

  // 新しいメッセージが追加されたときに自動スクロールする関数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (sessionId) {
      // sessionIdが有効な場合のみクエリを実行
      const messagesRef = ref(db, `messages/${sessionId}`);
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
      // FirebaseにセッションIDを登録する
      const sessionRef = ref(db, `sessions/${sessionId}`);
      set(sessionRef, { createdAt: new Date().toISOString() });
    }
  }, [sessionId]); // 依存配列にsessionIdを追加

  // メッセージリストが更新されるたびにスクロールを実行
  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatOpen]); // 依存配列に messages を追加

  // ユーザーの入力を処理する
  const handleUserInput = (input: string) => {
    sendMessage(input, "user");

    const inputNumber = parseInt(input.trim());
    if (chatWithSupport) {
      // サポート担当者とのチャット中の場合
      return;
    }

    if (chatWithAI) {
      const dataToSend = {
        query: input,
      };
      const callMainPyProcess = async () => {
        try {
          const response = await fetch("http://127.0.0.1:5000/process", {
            mode: "cors",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(dataToSend),
          });
          const responseData = await response.json();
          console.log(responseData);
          sendMessage(responseData.result, "bot");
        } catch (error) {
          console.error("Error calling main.py:", error);
        }
      };
      callMainPyProcess();
      return;
    }

    if (!nextQuestion) {
      switch (inputNumber) {
        case 1:
          // 会社についての情報
          sendMessage("どのような情報をご希望でしょうか？", "bot");
          setChatWithAI(true); // AI Agentとのチャットを開始
          break;
        case 2:
          // 仕事を依頼したい
          sendMessage(
            "どんなサービスを作成予定ですか？\n1. Webサイト\n2. 業務アプリ\n3. スマホアプリ",
            "bot"
          );
          setNextQuestion("serviceType");
          break;
        case 3:
          // その他
          sendMessage("担当者にお繋ぎしますので少々お待ち下さい。", "bot");
          setChatWithSupport(true); // 担当者とのチャットを開始
          break;
        default:
          sendMessage("escキーを押して最初から実行してください。", "bot");
      }
    } else {
      switch (nextQuestion) {
        case "serviceType":
          handleServiceType(inputNumber);
          break;
        case "dueDate":
          sendMessage(
            `予算はいくらでしょうか？（予算未定の場合は「未定」と入力してください）`,
            "bot"
          );
          setNextQuestion("budget");
          break;
        case "budget":
          sendMessage(
            `ありがとうございます。担当者からご連絡致しますのでemailアドレスを入力してください。`,
            "bot"
          );
          setNextQuestion("email");
          break;
        case "email":
          sendMessage(
            `ありがとうございます。担当者が1営業日以内にご連絡致しますので、このチャットは閉じて頂いて問題ありません。`,
            "bot"
          );
          setNextQuestion(""); // すべての質問が終わったらリセット
          break;
        default:
          sendMessage("エラーが発生しました。もう一度試してください。", "bot");
      }
    }
  };

  // サービスタイプの選択に応じた処理
  const handleServiceType = (inputNumber: number) => {
    let serviceType = "";
    switch (inputNumber) {
      case 1:
        serviceType = "Webサイト";
        break;
      case 2:
        serviceType = "業務アプリ";
        break;
      case 3:
        serviceType = "スマホアプリ";
        break;
      default:
        sendMessage("1から3の数字を入力してください。", "bot");
        return;
    }
    sendMessage(`${serviceType}ですね。いつまでに必要でしょうか？`, "bot");
    setNextQuestion("dueDate");
  };

  const sendMessage = (textLines: string | string[], author: string) => {
    try {
      const text = Array.isArray(textLines) ? textLines.join("\n") : textLines; // 配列かどうかをチェックして適切に処理
      const newMessageRef = push(ref(db, `messages/${sessionId}`)); // セッションIDを用いた正しいパス
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
    } catch (error) {
      console.error("Error in sendMessage function:", error); // エラーのロギング
    }
  };

  // const simulateBotResponse = () => {
  //   const botMessageRef = push(ref(db, "messages"));
  //   set(botMessageRef, {
  //     text: "Thanks for your message!",
  //     author: "bot",
  //   });
  // };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && event.shiftKey) {
      // shiftキーが押されていないときのみ反応
      event.preventDefault(); // フォームのデフォルトの送信を防ぐ
      handleUserInput(inputText); // メッセージ送信関数を呼び出す
      setInputText(""); // 入力フィールドをクリア
    } else if (event.key === "Escape") {
      // ESCキーが押された場合の処理
      resetChat();
    }
  };

  // チャットをリセットまたは閉じる関数
  const resetChat = () => {
    setIsChatOpen(false); // チャットウィンドウを閉じる
    setMessages([]); // メッセージリストをクリア
    setInputText(""); // 入力フィールドをクリア
  };

  return (
    <div className="App">
      {isChatOpen && (
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
                  message.author === "user"
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
      )}
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-0 right-0 mb-4 mr-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-700 transition duration-200"
        >
          チャットでお問い合わせ
        </button>
      )}
    </div>
  );
}

export default App;
