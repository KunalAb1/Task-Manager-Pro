const API_URL = "/tasks";
const AUTH_URL = "/auth";

let currentTaskId = null;
let currentFilter = "all";
let isSignupMode = false;

// ===== Auth Functions =====

function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    document.getElementById("authTitle").textContent = isSignupMode ? "Sign Up" : "Login";
    document.getElementById("authSubmitBtn").textContent = isSignupMode ? "Sign Up" : "Login";
    document.getElementById("signupNameRow").style.display = isSignupMode ? "block" : "none";
    document.getElementById("authToggleText").innerHTML = isSignupMode
        ? `Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>`
        : `Don't have an account? <a href="#" onclick="toggleAuthMode()">Sign up</a>`;
    document.getElementById("authError").textContent = "";
}

async function handleAuthSubmit() {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value.trim();
    const errorEl = document.getElementById("authError");
    errorEl.textContent = "";

    if (!email || !password) {
        errorEl.textContent = "Email and password are required";
        return;
    }

    if (isSignupMode) {
        const name = document.getElementById("signupName").value.trim();
        if (!name) {
            errorEl.textContent = "Name is required";
            return;
        }

        try {
            const res = await fetch(`${AUTH_URL}/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
                errorEl.textContent = data.message || "Signup failed";
                return;
            }
            // Auto-login after signup
            await performLogin(email, password);
        } catch {
            errorEl.textContent = "Something went wrong. Please try again.";
        }
    } else {
        await performLogin(email, password);
    }
}

async function performLogin(email, password) {
    const errorEl = document.getElementById("authError");
    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.message || "Login failed";
            return;
        }
        showTaskApp(data.data.name);
    } catch {
        errorEl.textContent = "Something went wrong. Please try again.";
    }
}

async function checkLoggedIn() {
    try {
        const res = await fetch(`${AUTH_URL}/getuser`, {
            credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
            showTaskApp(data.data.name);
        } else {
            showAuthSection();
        }
    } catch {
        showAuthSection();
    }
}

function showTaskApp(name) {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("taskApp").style.display = "block";
    document.getElementById("userName").textContent = name;
    getTasks();
}

function showAuthSection() {
    document.getElementById("authSection").style.display = "flex";
    document.getElementById("taskApp").style.display = "none";
}

function handleLogout() {
    document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    showAuthSection();
}

// Check login status when page loads
checkLoggedIn();

// ===== Task Functions =====

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

function isOverdue(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = dateStr.split("-");
    const due = new Date(year, month - 1, day);
    return due < today;
}

function getPriorityBadge(priority) {
    const map = {
        high:   { label: "High",   class: "priority-high" },
        medium: { label: "Medium", class: "priority-medium" },
        low:    { label: "Low",    class: "priority-low" }
    };
    const p = map[priority] || map.medium;
    return `<span class="priority-badge ${p.class}">${p.label}</span>`;
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    event.target.classList.add("active");
    getTasks();
}

async function getTasks() {
    const res = await fetch(API_URL, { credentials: "include" });
    if (!res.ok) {
        showAuthSection();
        return;
    }
    const data = await res.json();
    let tasks = data.tasks;

    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    document.getElementById("totalCount").textContent = total;
    document.getElementById("doneCount").textContent = done;

    if (currentFilter === "active") {
        tasks = tasks.filter(t => !t.completed);
    } else if (currentFilter === "completed") {
        tasks = tasks.filter(t => t.completed);
    } else if (currentFilter === "high") {
        tasks = tasks.filter(t => t.priority === "high");
    }

    const list = document.getElementById("taskList");
    list.innerHTML = "";

    if (tasks.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No tasks found!</p>
            </div>`;
        return;
    }

    tasks.forEach(function(task) {
        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";

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
                    onclick="toggleTask('${task._id}')">
                <div class="task-info">
                    <div class="task-title-row">
                        <span>${task.text}</span>
                        ${getPriorityBadge(task.priority)}
                    </div>
                    ${dueBadge}
                </div>
            </div>
            <div class="task-buttons">
                <button onclick="editTask('${task._id}')">✏️</button>
                <button onclick="deleteTask('${task._id}')">🗑️</button>
            </div>
        `;
        list.appendChild(li);
    });
}

async function addTask() {
    const input = document.getElementById("taskInput");
    const dueDateInput = document.getElementById("dueDateInput");
    const priorityInput = document.getElementById("priorityInput");
    const task = input.value.trim();

    if (!task) return;

    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            task,
            dueDate: dueDateInput.value || null,
            priority: priorityInput.value
        })
    });

    input.value = "";
    dueDateInput.value = "";
    priorityInput.value = "medium";
    getTasks();
}

document.getElementById("taskInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") addTask();
});

async function toggleTask(id) {
    await fetch(`${API_URL}/${id}/toggle`, {
        method: "PATCH",
        credentials: "include",
    });
    getTasks();
}

function editTask(id) {
    currentTaskId = id;
    const modal = document.getElementById("editModal");
    const textInput = document.getElementById("editInput");
    const dueDateInput = document.getElementById("editDueDateInput");
    const priorityInput = document.getElementById("editPriorityInput");

    fetch(API_URL, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
            const task = data.tasks.find(t => t._id === id);
            if (!task) return;
            textInput.value = task.text;
            dueDateInput.value = task.dueDate ? task.dueDate.split("T")[0] : "";
            priorityInput.value = task.priority || "medium";
            modal.style.display = "flex";
        });
}

async function updateTask() {
    const input = document.getElementById("editInput");
    const dueDateInput = document.getElementById("editDueDateInput");
    const priorityInput = document.getElementById("editPriorityInput");
    const newTask = input.value.trim();

    if (!newTask) return;

    await fetch(`${API_URL}/${currentTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            task: newTask,
            dueDate: dueDateInput.value || null,
            priority: priorityInput.value
        })
    });

    closeModal();
    getTasks();
}

function closeModal() {
    document.getElementById("editModal").style.display = "none";
}

async function deleteTask(id) {
    await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        credentials: "include",
    });
    getTasks();
}