const API_URL = "http://localhost:3000/tasks";

let currentIndex = null;
let currentFilter = "all"; // track active filter

//  Format date
function formatDate(dateStr) {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split("-");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

//  Check if overdue
function isOverdue(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = dateStr.split("-");
    const due = new Date(year, month - 1, day);
    return due < today;
}

//  Priority badge helper
function getPriorityBadge(priority) {
    const map = {
        high:   { label: "High",   class: "priority-high" },
        medium: { label: "Medium", class: "priority-medium" },
        low:    { label: "Low",    class: "priority-low" }
    };
    const p = map[priority] || map.medium;
    return `<span class="priority-badge ${p.class}">${p.label}</span>`;
}

// Set active filter
function setFilter(filter) {
    currentFilter = filter;

    // update active button
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    event.target.classList.add("active");

    getTasks();
}

async function getTasks() {
    const res = await fetch(API_URL);
    const data = await res.json();

    let tasks = data.tasks;

    //  update counter (always based on all tasks)
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    document.getElementById("totalCount").textContent = total;
    document.getElementById("doneCount").textContent = done;

    //  apply filter
    if (currentFilter === "active") {
        tasks = tasks.filter(t => !t.completed);
    } else if (currentFilter === "completed") {
        tasks = tasks.filter(t => t.completed);
    } else if (currentFilter === "high") {
        tasks = tasks.filter(t => t.priority === "high");
    }

    const list = document.getElementById("taskList");
    list.innerHTML = "";

    //  empty state
    if (tasks.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No tasks found!</p>
            </div>`;
        return;
    }

    tasks.forEach(function(task, index) {
        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";

        // due date badge
        let dueBadge = "";
        if (task.dueDate) {
            const overdue = !task.completed && isOverdue(task.dueDate);
            dueBadge = `<span class="due-date ${overdue ? "overdue" : ""}">
                📅 ${formatDate(task.dueDate)}
            </span>`;
        }

        li.innerHTML = `
            <div class="task-left">
                <input type="checkbox"
                    ${task.completed ? "checked" : ""}
                    onclick="toggleTask(${index})">
                <div class="task-info">
                    <div class="task-title-row">
                        <span>${task.text}</span>
                        ${getPriorityBadge(task.priority)}
                    </div>
                    ${dueBadge}
                </div>
            </div>
            <div class="task-buttons">
                <button onclick="editTask(${index})">✏️</button>
                <button onclick="deleteTask(${index})">🗑️</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// Add task
async function addTask() {
    const input = document.getElementById("taskInput");
    const dueDateInput = document.getElementById("dueDateInput");
    const priorityInput = document.getElementById("priorityInput");
    const task = input.value.trim();

    if (!task) return;

    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            task,
            dueDate: dueDateInput.value || null,
            priority: priorityInput.value  //  send priority
        })
    });

    input.value = "";
    dueDateInput.value = "";
    priorityInput.value = "medium"; //  reset to medium
    getTasks();
}

// Enter key support
document.getElementById("taskInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") addTask();
});

// Toggle completion
async function toggleTask(index) {
    await fetch(`${API_URL}/${index}/toggle`, {
        method: "PATCH"
    });
    getTasks();
}

// Edit task
function editTask(index) {
    currentIndex = index;
    const modal = document.getElementById("editModal");
    const textInput = document.getElementById("editInput");
    const dueDateInput = document.getElementById("editDueDateInput");
    const priorityInput = document.getElementById("editPriorityInput");

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            const task = data.tasks[index];
            textInput.value = task.text;
            dueDateInput.value = task.dueDate || "";
            priorityInput.value = task.priority || "medium"; //  pre-fill priority
            modal.style.display = "flex";
        });
}

// Update task
async function updateTask() {
    const input = document.getElementById("editInput");
    const dueDateInput = document.getElementById("editDueDateInput");
    const priorityInput = document.getElementById("editPriorityInput");
    const newTask = input.value.trim();

    if (!newTask) return;

    await fetch(`${API_URL}/${currentIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            task: newTask,
            dueDate: dueDateInput.value || null,
            priority: priorityInput.value //  send updated priority
        })
    });

    closeModal();
    getTasks();
}

function closeModal() {
    document.getElementById("editModal").style.display = "none";
}

// Delete task
async function deleteTask(index) {
    await fetch(`${API_URL}/${index}`, {
        method: "DELETE"
    });
    getTasks();
}

// Load on start
getTasks();
