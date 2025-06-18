// app.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const modeSelectionSection = document.getElementById('mode-selection');
    const unitSelectionSection = document.getElementById('unit-selection');
    const exerciseAreaSection = document.getElementById('exercise-area');
    const resultsAreaSection = document.getElementById('results-area');

    const btnPracticeMode = document.getElementById('btn-practice-mode');
    const btnExamMode = document.getElementById('btn-exam-mode');
    const btnBackToMode = document.getElementById('btn-back-to-mode');
    const unitButtonsContainer = document.getElementById('unit-buttons-container');

    const currentTaskTitle = document.getElementById('current-task-title');
    const questionContainer = document.getElementById('question-container');
    const answerInputArea = document.getElementById('answer-input-area');
    const feedbackArea = document.getElementById('feedback-area');
    const btnPrevQuestion = document.getElementById('btn-prev-question');
    const btnNextQuestion = document.getElementById('btn-next-question');
    const btnCheckAnswer = document.getElementById('btn-check-answer');
    const btnFinishExam = document.getElementById('btn-finish-exam');
    const btnBackToUnit = document.getElementById('btn-back-to-unit');

    const totalScoreEl = document.getElementById('total-score');
    const detailedResultsEl = document.getElementById('detailed-results');
    const btnRestart = document.getElementById('btn-restart');

    // --- App State ---
    let currentMode = null; // 'practice' or 'exam'
    let currentUnitId = null;
    let currentUnitData = null;
    let allQuestionsForUnit = []; // Flattened list of questions for the current unit
    let QuestionsChecked = [];
    let currentQuestionIndex = 0;
    let userAnswers = []; // For exam mode
    let score = 0;
    let allUnitsUserData = {};
    // --- Event Listeners ---
    btnPracticeMode.addEventListener('click', () => selectMode('practice'));
    btnExamMode.addEventListener('click', () => selectMode('exam'));
    btnBackToMode.addEventListener('click', showModeSelection);
    btnBackToUnit.addEventListener('click', () => BackToUnit(currentMode));
    btnNextQuestion.addEventListener('click', handleNextQuestion);
    btnPrevQuestion.addEventListener('click', handlePrevQuestion);
    btnCheckAnswer.addEventListener('click', checkPracticeAnswer);
    btnFinishExam.addEventListener('click', finishExam);
    btnRestart.addEventListener('click', restartUnit);

    // --- Functions ---

    function showSection(sectionToShow) {
        [modeSelectionSection, unitSelectionSection, exerciseAreaSection, resultsAreaSection].forEach(section => {
            section.classList.add('hidden');
        });
        sectionToShow.classList.remove('hidden');
    }

    function selectMode(mode) {
        currentMode = mode;
        showUnitSelection();
    }

    function showModeSelection() {
        resetAppState();
        showSection(modeSelectionSection);
    }
    function BackToUnit()   {
        saveUserAnswer();
        allUnitsUserData[currentUnitId] =[QuestionsChecked,userAnswers,currentQuestionIndex]; //save user data
        showUnitSelection(currentMode);
    }
    function showUnitSelection() {
        
        showSection(unitSelectionSection);
        unitButtonsContainer.innerHTML = ''; // Clear previous buttons
        Object.keys(allUnitsData).forEach(unitId => {
            const unit = allUnitsData[unitId];
            const button = document.createElement('button');
            button.textContent = unit.name || unitId.toUpperCase(); // Use unit name if available
            button.dataset.unitId = unitId;
            button.addEventListener('click', () => startUnit(unitId));
            unitButtonsContainer.appendChild(button);
        });
    }

    function startUnit(unitId) {
        currentUnitId = unitId;
        currentUnitData = allUnitsData[unitId];
        if (!currentUnitData) {
            alert('错误：未找到单元数据！');
            return;
        }
        prepareQuestionsForUnit();
        
        if (Object.hasOwn(allUnitsUserData, currentUnitId))
        {
            userAnswers = allUnitsUserData[currentUnitId][1];
            QuestionsChecked = allUnitsUserData[currentUnitId][0];
            currentQuestionIndex = allUnitsUserData[currentUnitId][2];
        }
        else{
            userAnswers = new Array(allQuestionsForUnit.length).fill(null);
            QuestionsChecked = new Array(allQuestionsForUnit.length).fill(null);
            currentQuestionIndex = 0;
        }
        score = 0;
        showSection(exerciseAreaSection);
        displayQuestion();
        updateButtonVisibility();
    }

    function prepareQuestionsForUnit() {
        allQuestionsForUnit = [];
        if (!currentUnitData) return;

        // Order of question types as requested
        const questionTypesInOrder = [
            "wordTranslationCtoE",
            "phraseTranslationEtoC",
            "sentenceTranslationCtoE",
            "passageTranslationEtoC",
            "multipleChoice"
        ];

        questionTypesInOrder.forEach(typeKey => {
            if (currentUnitData[typeKey]) {
                currentUnitData[typeKey].forEach(q => {
                    allQuestionsForUnit.push({...q, questionTypeName: getQuestionTypeName(q.type)});
                });
            }
        });
         console.log("Prepared questions:", allQuestionsForUnit);
    }

    function getQuestionTypeName(type) {
        switch(type) {
            case 'CtoE_word': return 'I. Words';
            case 'EtoC_phrase': return 'II. Phrases';
            case 'CtoE_sentence': return 'III. Sentences';
            case 'EtoC_passage': return 'IV. Paragraph';
            case 'MCQ': return 'V. Multiple Choice';
            default: return 'Question';
        }
    }

    function displayQuestion() {
        if (currentQuestionIndex < 0 || currentQuestionIndex >= allQuestionsForUnit.length) {
            console.error("Invalid question index:", currentQuestionIndex);
            if(allQuestionsForUnit.length === 0 && currentMode === 'exam') finishExam(); // No questions, end exam
            else if(allQuestionsForUnit.length === 0) showUnitSelection(); // No questions, go back
            return;
        }

        const questionData = allQuestionsForUnit[currentQuestionIndex];
        currentTaskTitle.textContent = `${currentUnitData.name || currentUnitId.toUpperCase()} - ${questionData.questionTypeName} (${currentQuestionIndex + 1}/${allQuestionsForUnit.length})`;
        questionContainer.innerHTML = `<p>${questionData.question}</p>`;
        answerInputArea.innerHTML = ''; // Clear previous input
        feedbackArea.innerHTML = '';
        feedbackArea.className = 'feedback-area'; // Reset class

        if (questionData.type === 'MCQ') {
            const optionsContainer = document.createElement('div');
            questionData.options.forEach((option, index) => {
                const id = `q${questionData.id}_opt${index}`;
                const div = document.createElement('div');
                div.className = 'mcq-option';
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `q_${questionData.id}`;
                radio.id = id;
                radio.value = option;
                if (userAnswers[currentQuestionIndex] === option) radio.checked = true;

                const label = document.createElement('label');
                label.htmlFor = id;
                label.textContent = option;

                div.appendChild(radio);
                div.appendChild(label);
                optionsContainer.appendChild(div);
            });
            answerInputArea.appendChild(optionsContainer);
        } else if (questionData.type === 'EtoC_passage' || questionData.type === 'CtoE_passage') { // Assuming CtoE_passage might exist
            const textarea = document.createElement('textarea');
            textarea.id = 'answer-text';
            textarea.placeholder = '在此输入您的翻译...';
            textarea.value = userAnswers[currentQuestionIndex] || '';
            answerInputArea.appendChild(textarea);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'answer-text';
            input.placeholder = '在此输入您的答案...';
            input.value = userAnswers[currentQuestionIndex] || '';
            answerInputArea.appendChild(input);
        }
        updateButtonVisibility();
        if (QuestionsChecked[currentQuestionIndex]==true)
            checkPracticeAnswer();
    }

    function handleNextQuestion() {
        //if (currentMode === 'exam'||) {
            saveUserAnswer();
        //}

        if (currentQuestionIndex < allQuestionsForUnit.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
        } else {
            // Last question
            if (currentMode === 'exam') {
                finishExam();
            } else {
                finishExam();
                // Practice mode: maybe show a "unit complete" message or offer to go to next unit/main menu
                //alert("练习完成！");
                //btnNextQuestion.classList.add('hidden'); // Hide next if no more questions
            }
        }
    }

    function handlePrevQuestion() {
        if (currentQuestionIndex > 0) {
            //if (currentMode === 'exam') 
                saveUserAnswer(); // Save current before going back
            currentQuestionIndex--;
            displayQuestion();
        }
    }

    function saveUserAnswer() {
        const questionData = allQuestionsForUnit[currentQuestionIndex];
        let userAnswer;
        if (questionData.type === 'MCQ') {
            const selectedOption = answerInputArea.querySelector(`input[name="q_${questionData.id}"]:checked`);
            userAnswer = selectedOption ? selectedOption.value : null;
        } else {
            const inputEl = document.getElementById('answer-text');
            userAnswer = inputEl ? inputEl.value.trim() : null;
        }
        userAnswers[currentQuestionIndex] = userAnswer;
    }

    function checkPracticeAnswer() {
        const questionData = allQuestionsForUnit[currentQuestionIndex];
        let userAnswer;
        if (questionData.type === 'MCQ') {
            const selectedOption = answerInputArea.querySelector(`input[name="q_${questionData.id}"]:checked`);
            userAnswer = selectedOption ? selectedOption.value : null;
        } else {
            const inputEl = document.getElementById('answer-text');
            userAnswer = inputEl ? inputEl.value.trim() : null;
        }

        feedbackArea.innerHTML = '';
        let isCorrect = false;
        const correctAnswer = questionData.answer;

        // Basic case-insensitive check for string answers.
        // For more complex answers, you might need more sophisticated comparison.
        if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
            isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        } else {
            isCorrect = userAnswer === correctAnswer;
        }


        if (isCorrect) {
            feedbackArea.textContent = '正确！ (Correct!)';
            feedbackArea.className = 'feedback-area feedback-correct';
        } else {
            feedbackArea.textContent = `错误 (Incorrect). 正确答案 (Correct Answer): ${correctAnswer}`;
            feedbackArea.className = 'feedback-area feedback-incorrect';
        }
        QuestionsChecked[currentQuestionIndex] = true;
    }

    function finishExam() {
        saveUserAnswer(); // Save the last answer
        calculateScore();
        displayResults();
        showSection(resultsAreaSection);
    }

    function calculateScore() {
        score = 0;
        detailedResultsEl.innerHTML = ''; // Clear previous results

        allQuestionsForUnit.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const correctAnswer = question.answer;
            let isCorrect = false;

            if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
                isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
            } else {
                isCorrect = userAnswer === correctAnswer;
            }

            if (isCorrect) {
                score++;
            }

            const resultItem = document.createElement('div');
            resultItem.innerHTML = `
                <p>题目 ${index + 1} (${getQuestionTypeName(question.type)}): <strong>${question.question}</strong></p>
                <p>你的答案: <span class="${isCorrect ? 'text-success' : 'text-danger'}"><strong>${userAnswer || '未作答'}</strong></span></p>
                <p><strong>${!isCorrect ? `错误 (Incorrect)!  正确答案: ${correctAnswer}` : '正确！ (Correct!)'}</strong></p>
                <hr>
            `;
            if (isCorrect) {
               
                resultItem.className = 'feedback-area feedback-correct';
            } else {
               
                resultItem.className = 'feedback-area feedback-incorrect';
            }
            detailedResultsEl.appendChild(resultItem);
        });
        totalScoreEl.textContent = `${score} / ${allQuestionsForUnit.length}`;
    }


    function displayResults() {
        totalScoreEl.textContent = `${score} / ${allQuestionsForUnit.length}`;
        // Detailed results are built during calculateScore
    }

    function updateButtonVisibility() {
        const isFirstQuestion = (currentQuestionIndex === 0);
        const isLastQuestion = (currentQuestionIndex === allQuestionsForUnit.length - 1);
        const noQuestions = (allQuestionsForUnit.length === 0);
        btnPrevQuestion.classList.remove('hidden');
        btnPrevQuestion.disabled = isFirstQuestion || noQuestions;

        btnNextQuestion.disabled = isLastQuestion;

        btnCheckAnswer.classList.toggle('hidden', currentMode !== 'practice');
        //btnFinishExam.classList.toggle('hidden', currentMode !== 'exam' || currentQuestionIndex !== allQuestionsForUnit.length -1); // Show only on last Q in exam
        // Or always show finish exam button:
        // btnFinishExam.classList.toggle('hidden', currentMode !== 'exam');

        //if (currentQuestionIndex === allQuestionsForUnit.length -1 && currentMode === 'practice') {
       //     btnNextQuestion.classList.add('hidden'); // No "next" on last practice question
       // } else if (currentMode === 'practice') {
        //    btnNextQuestion.classList.remove('hidden');
        //}


    }

    function resetAppState() {
        allUnitsUserData = {};
        QuestionsChecked = [];
        currentMode = null;
        currentUnitId = null;
        currentUnitData = null;
        allQuestionsForUnit = [];
        currentQuestionIndex = 0;
        userAnswers = [];
        score = 0;
        feedbackArea.innerHTML = '';
        feedbackArea.className = 'feedback-area';
    }

    function restartUnit() {
        delete allUnitsUserData[currentUnitId];
        QuestionsChecked = [];
        
        currentUnitId = null;
        currentUnitData = null;
        allQuestionsForUnit = [];
        currentQuestionIndex = 0;
        userAnswers = [];
        score = 0;
        feedbackArea.innerHTML = '';
        feedbackArea.className = 'feedback-area';
        showUnitSelection();
    }
    function restartApp() {
        resetAppState();
        showModeSelection();
    }

    // --- Initial Setup ---
    showModeSelection(); // Start with mode selection
});