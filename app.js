const express = require("express");
const bodyParser = require("body-parser");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();

const openai = new OpenAI({ apiKey: process.env.API_KEY });

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // 静的ファイルのための設定
app.use(bodyParser.json());

let userIngredients = {};

let chatState = {};
let userResponses = {};

app.get("/", (req, res) => {
  res.render("chat");
});

app.post("/chat", async (req, res) => {
  let prompt = "";
  const userId = req.body.userId;
  const userMessage = req.body.message;

  if (!chatState[userId]) {
    chatState[userId] = "料理の種類";
    userResponses[userId] = {};
  }

  switch (chatState[userId]) {
    case "料理の種類":
      userResponses[userId].type = userMessage;
      chatState[userId] = "主要な材料";
      res.json({ botMessage: "主要な材料は何ですか？" });
      break;

    case "主要な材料":
      userResponses[userId].ingredients = userMessage;
      chatState[userId] = "調理方法";
      res.json({ botMessage: "この料理の調理方法を教えてください。" });
      break;

    case "調理方法":
      userResponses[userId].method = userMessage;
      chatState[userId] = "料理の目的や場面";
      res.json({ botMessage: "この料理を作る目的や場面を教えてください。" });
      break;

    case "料理の目的や場面":
      userResponses[userId].purpose = userMessage;
      chatState[userId] = "仕上げや装飾";
      res.json({ botMessage: "仕上げや装飾について教えてください。" });
      break;

    case "仕上げや装飾":
      userResponses[userId].finishing = userMessage;
      chatState[userId] = "終了";
      prompt = `${userResponses[userId].type}。主要な材料は${userResponses[userId].ingredients}。調理方法は${userResponses[userId].method}。目的は${userResponses[userId].purpose}。仕上げは${userResponses[userId].finishing}。の完成画像。`;
      // このプロンプトを使用して画像生成を要求します。
      res.json({
        botMessage:
          "ありがとうございます！入力された詳細に基づいて画像を生成中...",
      });
      break;
    case "終了":
      prompt = `料理の画像。${userResponses[userId].type}。主要な材料は${userResponses[userId].ingredients}。調理方法は${userResponses[userId].method}。目的は${userResponses[userId].purpose}。仕上げは${userResponses[userId].finishing}。の完成画像。`;

      try {
        const response = await openai.images.generate({
          prompt: prompt,
        });
        const imageUrl = response.data[0].url; // 画像のURLを取得。レスポンスの形式により調整が必要。
        res.json({
          botMessage: `画像を生成しました: <img width="500" src="${imageUrl}" />`,
        }); // Markdown形式でリンクを表示
      } catch (error) {
        console.error("Error generating image:", error);
        res.json({ botMessage: "画像の生成に失敗しました。" });
      }
      break;

    default:
      res.json({
        botMessage: "不明なステータスです。もう一度やり直してください。",
      });
  }
});

// 画像生成部分は以前のコードを使用します。

app.get("/generateImage/:userId", async (req, res) => {
  const userId = req.params.userId;
  if (chatState[userId] === "終了") {
    const recipeDescription = userIngredients[userId].join(", ");

    console.log({ recipeDescription });

    try {
      const response = await openai.images.generate({
        prompt: `料理の画像を出力する。材料は${recipeDescription}の完成画像`,
      });

      const imageUrl = response.data[0].url;
      res.render("result", { imageUrl: imageUrl });
    } catch (error) {
      console.error("画像生成エラー:", error);
      res.status(500).send("画像生成エラー");
    }
  } else {
    res.status(400).send("画像を生成する前にチャットを終了してください");
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`アプリはポート ${PORT} で動作中`);
});
