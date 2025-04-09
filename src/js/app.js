let languages = [];
let vocabList = [];
let currentTestIndex = 0;
let userAnswers = [];

function addLanguage() {
  const input = document.getElementById("languageInput");
  if (languages.length >= 4) return alert("Tối đa 4 ngôn ngữ");
  if (!input.value.trim()) return;
  languages.push(input.value.trim());
  input.value = "";
  renderLanguages();
}

function renderLanguages() {
  const ul = document.getElementById("languageList");
  ul.innerHTML = "";
  languages.forEach((lang, i) => {
    const li = document.createElement("li");
    li.textContent = lang + " ";
    const btn = document.createElement("button");
    btn.textContent = "Xoá";
    btn.onclick = () => {
      languages.splice(i, 1);
      renderLanguages();
    };
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function addVocabPair() {
  if (languages.length < 2) return alert("Cần ít nhất 2 ngôn ngữ");
  const div = document.createElement("div");
  div.classList.add("word-pair");
  languages.forEach((lang) => {
    const input = document.createElement("input");
    input.placeholder = `Nhập từ bằng ${lang}`;
    input.dataset.lang = lang;
    div.appendChild(input);
  });
  document.getElementById("wordInputs").appendChild(div);
}

function startTest() {
  const inputs = document.querySelectorAll(".word-pair");
  if (inputs.length < 5) return alert("Cần ít nhất 5 cặp từ");
  vocabList = [];
  inputs.forEach((pair) => {
    const inputs = pair.querySelectorAll("input");
    const pairObj = {};
    inputs.forEach(
      (input) => (pairObj[input.dataset.lang] = input.value.trim())
    );
    vocabList.push(pairObj);
  });

  currentTestIndex = 0;
  userAnswers = [];
  document.getElementById("test-section").style.display = "block";
  document.getElementById("startTestBtn").style.display = "none";
  showTestWord();
}

function showTestWord() {
  const fromLang = languages[0];
  document.getElementById("testWord").textContent =
    vocabList[currentTestIndex][fromLang];
  document.getElementById("userAnswer").value = "";
  updateProgress();
}

function submitAnswer() {
  const toLang = languages[1]; // dùng ngôn ngữ thứ 2 để kiểm tra
  const userInput = document.getElementById("userAnswer").value.trim();
  userAnswers.push(userInput);

  currentTestIndex++;
  if (currentTestIndex < vocabList.length) {
    showTestWord();
  } else {
    showResult();
  }
}

function updateProgress() {
  const progress = document.getElementById("progressBar");
  progress.max = vocabList.length;
  progress.value = currentTestIndex;
}

function showResult() {
  document.getElementById("test-section").style.display = "none";
  document.getElementById("result-section").style.display = "block";

  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";
  let correct = 0;
  vocabList.forEach((item, i) => {
    const tr = document.createElement("tr");
    const fromLang = languages[0];
    const toLang = languages[1];
    const answer = userAnswers[i];
    const correctAnswer = item[toLang];
    const isCorrect = answer.toLowerCase() === correctAnswer.toLowerCase();

    if (isCorrect) correct++;

    tr.className = isCorrect ? "hit" : "miss";
    tr.innerHTML = `
      <td>${item[fromLang]}</td>
      <td>${correctAnswer}</td>
      <td>${answer}</td>
      <td>${isCorrect ? "✓" : "✗"}</td>
    `;
    tbody.appendChild(tr);
  });

  const ratio = ((correct / vocabList.length) * 100).toFixed(1);
  document.getElementById("score").textContent = `Tỷ lệ chính xác: ${ratio}%`;
}

function resetApp() {
  location.reload();
}
