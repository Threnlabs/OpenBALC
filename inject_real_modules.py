#!/usr/bin/env python3
import os
import sys
import requests
import json
import getpass

# ─── REAL MODULE DATA DEFINITION ──────────────────────────────────────────────
REAL_MODULES = [
    {
        "title": "Introduction to Quantum Computing",
        "subject": "Computer Science",
        "description": "A comprehensive introduction to quantum bits, quantum gates, quantum algorithms (like Shor's and Grover's), and the physical realization of quantum computers.",
        "topics": [
            {
                "name": "Foundations of Quantum Mechanics",
                "description": "Superposition, entanglement, measurement, and the mathematical framework of quantum states.",
                "content": {
                    "chapter": "Superposition and Entanglement",
                    "body": r"""# Foundations of Quantum Mechanics

Quantum computing relies on the unique properties of quantum mechanics to process information in ways that classical computers cannot.

## 1. Qubits and Superposition
Unlike a classical bit which can only exist in state 0 or 1, a quantum bit (qubit) can exist in a linear combination of both states simultaneously. This is known as superposition:

$$|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$$

where $\alpha$ and $\beta$ are complex numbers representing probability amplitudes. According to Born's rule, the probability of measuring the qubit in state $|0\rangle$ is $|\alpha|^2$, and in state $|1\rangle$ is $|\beta|^2$. Because the total probability must equal 1:

$$|\alpha|^2 + |\beta|^2 = 1$$

When a qubit in superposition is measured, its state collapses to either $|0\rangle$ or $|1\rangle$, and the superposition is lost.

## 2. Quantum Entanglement
Quantum entanglement is a phenomenon where two or more qubits become correlated such that the state of one qubit cannot be described independently of the state of the other(s), even if they are separated by astronomical distances. 

A classic example is the EPR pair or Bell state:

$$|\Phi^+\rangle = \frac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$$

Measuring the first qubit immediately determines the outcome of the measurement on the second qubit. If the first qubit collapses to $|0\rangle$, the second qubit is guaranteed to be $|0\rangle$; if the first collapses to $|1\rangle$, the second is guaranteed to be $|1\rangle$."""
                }
            },
            {
                "name": "Quantum Bits and Gates",
                "description": "Geometric representation on the Bloch sphere and unitary matrices representing quantum logic gates.",
                "content": {
                    "chapter": "Single-Qubit and Multi-Qubit Operators",
                    "body": r"""# Quantum Gates and Bloch Sphere

Quantum logic gates are mathematically represented by unitary matrices. Unitary matrices preserve the norm of the state vector, ensuring that the total probability remains 1.

## 1. The Bloch Sphere
The Bloch sphere is a geometric representation of the state space of a single qubit. Any pure state $|\psi\rangle$ can be written as:

$$|\psi\rangle = \cos\frac{\theta}{2}|0\rangle + e^{i\phi}\sin\frac{\theta}{2}|1\rangle$$

where $\theta$ (inclination) and $\phi$ (azimuth) represent coordinates on the sphere:
- $0 \le \theta \le \pi$
- $0 \le \phi < 2\pi$

The north pole represents $|0\rangle$, the south pole represents $|1\rangle$, and points along the equator represent equal-superposition states.

## 2. Single-Qubit Gates
- **Hadamard Gate (H)**: Maps the basis states $|0\rangle$ and $|1\rangle$ into superposition:
  $$H = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}$$
- **Pauli-X Gate**: Acts as the quantum NOT gate (bit-flip):
  $$X = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}$$
- **Pauli-Z Gate**: Performs a phase-flip on the state $|1\rangle$:
  $$Z = \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}$$

## 3. Multi-Qubit Gates
The **Controlled-NOT (CNOT)** gate is a two-qubit operator that flips the target qubit if the control qubit is in state $|1\rangle$:

$$\text{CNOT} = \begin{pmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 1 & 0 \end{pmatrix}$$"""
                }
            }
        ]
    },
    {
        "title": "Advanced TypeScript Design Patterns",
        "subject": "Software Engineering",
        "description": "Master advanced TypeScript features such as conditional types, template literal types, mapped types, utility types, and how to apply them to build robust design patterns.",
        "topics": [
            {
                "name": "Advanced Type Manipulation",
                "description": "Generics, conditional types, and extracting types using the infer keyword.",
                "content": {
                    "chapter": "Generics and Conditional Types",
                    "body": r"""# Advanced Type Manipulation

TypeScript's type system is Turing-complete, allowing you to manipulate and compute types dynamically at compile time.

## 1. Conditional Types
Conditional types follow the ternary operator syntax and let you perform type-level branching:

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
```

## 2. The `infer` Keyword
The `infer` keyword allows you to declare a type variable within a conditional type's `extends` clause to extract nested types:

```typescript
// Custom utility to extract return type of a function
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

const fetchUser = () => ({ id: 1, name: "Alice" });
type User = MyReturnType<typeof fetchUser>; // { id: number; name: string; }
```

## 3. Distributive Conditional Types
When conditional types act on a generic parameter that is a generic union type, they become distributive. For example, `IsString<string | number>` expands to `IsString<string> | IsString<number>`, which evaluates to `true | false`."""
                }
            },
            {
                "name": "Mapped and Template Literal Types",
                "description": "Dynamic type transformations and type-safe string formatting.",
                "content": {
                    "chapter": "Creating Dynamic Utilities",
                    "body": r"""# Mapped and Template Literal Types

Mapped types and template literal types enable powerful transformations of existing models and strings.

## 1. Mapped Types
Mapped types build on index signatures to iterate over property keys and transform their values:

```typescript
type Optional<T> = {
  [P in keyof T]?: T[P];
};

interface User {
  id: number;
  email: string;
}

type PartialUser = Optional<User>; // { id?: number; email?: string; }
```

## 2. Template Literal Types
Template literal types allow you to manipulate string types dynamically:

```typescript
type Event = "click" | "hover" | "submit";
type HandlerName = `on${Capitalize<Event>}`; // "onClick" | "onHover" | "onSubmit"

function registerHandler(name: HandlerName, cb: () => void) {
  // implementation
}

registerHandler("onClick", () => {}); // OK
registerHandler("click", () => {});   // Error: Argument of type '"click"' is not assignable to 'HandlerName'
```"""
                }
            }
        ]
    },
    {
        "title": "Mastering Neural Networks and Deep Learning",
        "subject": "Artificial Intelligence",
        "description": "A deep dive into the architecture, mathematics, and optimization of deep neural networks, covering backpropagation, regularization, CNNs, and Transformers.",
        "topics": [
            {
                "name": "Neural Network Foundations",
                "description": "Perceptrons, activation functions, weights, biases, and loss computation.",
                "content": {
                    "chapter": "Perceptrons and Activation Functions",
                    "body": r"""# Neural Network Foundations

Deep learning architectures are built upon layers of interconnected artificial neurons.

## 1. The Artificial Neuron
A neuron computes a weighted sum of its inputs, adds a bias term, and passes the result through a non-linear activation function:

$$z = \sum_{i=1}^n w_i x_i + b = W^T X + b$$

$$a = g(z)$$

where $W$ is the weight vector, $X$ is the input vector, $b$ is the bias, and $g$ is the activation function.

## 2. Key Activation Functions
- **Sigmoid**: Maps inputs to a range between 0 and 1, commonly used for binary classification.
  $$\sigma(z) = \frac{1}{1 + e^{-z}}$$
- **ReLU (Rectified Linear Unit)**: Solves the vanishing gradient problem and introduces sparsity.
  $$f(z) = \max(0, z)$$
- **Softmax**: Converts a vector of raw scores (logits) into a probability distribution.
  $$\text{Softmax}(z_i) = \frac{e^{z_i}}{\sum_{j} e^{z_j}}$$"""
                }
            },
            {
                "name": "Sequence Models and Transformers",
                "description": "The transition from RNNs to attention mechanisms and transformer blocks.",
                "content": {
                    "chapter": "The Self-Attention Mechanism",
                    "body": r"""# Sequence Models and Transformers

The Transformer architecture replaced recurrence with attention, allowing models to process tokens in parallel and capture long-range dependencies.

## 1. The Self-Attention Mechanism
Self-attention computes how much each token in a sequence should attend to every other token. It utilizes three vectors: Queries ($Q$), Keys ($K$), and Values ($V$):

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

where $d_k$ is the dimensionality of the keys, serving as a scaling factor to prevent the softmax function from pushing gradients into regions with extremely small derivatives.

## 2. Multi-Head Attention
Instead of performing a single attention function, multi-head attention performs the attention mechanism in parallel across multiple projections, allowing the model to attend to different parts of the input simultaneously:

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \dots, head_h)W^O$$

where $\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$."""
                }
            }
        ]
    }
]

ARTIFACTS_MAPPING = {
    "Introduction to Quantum Computing": [
        {
            "title": "Quantum Computing Essentials Mindmap",
            "type": "diagram",
            "content": json.dumps({
                "name": "Quantum Computing",
                "children": [
                  {
                    "name": "Qubits & States",
                    "children": [
                      {"name": "Superposition", "children": []},
                      {"name": "Entanglement", "children": []},
                      {"name": "Born Rule", "children": []}
                    ]
                  },
                  {
                    "name": "Quantum Gates",
                    "children": [
                      {"name": "Hadamard (H)", "children": []},
                      {"name": "Pauli X/Z", "children": []},
                      {"name": "CNOT Gate", "children": []}
                    ]
                  }
                ]
            })
        },
        {
            "title": "Quantum Vocab Flashcards",
            "type": "document",
            "content": json.dumps([
                {"front": "Qubit", "back": "A quantum bit, the basic unit of quantum information, capable of superposition."},
                {"front": "Superposition", "back": "A principle where a system can exist in multiple states simultaneously until measured."},
                {"front": "Entanglement", "back": "A state where two particles are correlated so that one determines the other instantly."}
            ])
        },
        {
            "title": "Quantum Gates & Operators Cheatsheet",
            "type": "markdown",
            "content": """# Quantum Computing Cheatsheet

## Bell States (Entangled Pairs)
The four Bell states are maximally entangled two-qubit states:
$$|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |11\\rangle)$$
$$|\\Phi^-\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle - |11\\rangle)$$
$$|\\Psi^+\\rangle = \\frac{1}{\\sqrt{2}}(|01\\rangle + |10\\rangle)$$
$$|\\Psi^-\\rangle = \\frac{1}{\\sqrt{2}}(|01\\rangle - |10\\rangle)$$

## Quantum Gates Reference
- **Hadamard Gate ($H$)**: Creates superposition.
  $$H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}$$
- **Pauli-X Gate ($X$)**: Bit-flip (equivalent to classical NOT).
  $$X = \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}$$
- **Pauli-Z Gate ($Z$)**: Phase-flip (flips the sign of $|1\\rangle$).
  $$Z = \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}$$
"""
        },
        {
            "title": "Python Quantum Gate Simulation",
            "type": "code",
            "content": """import numpy as np

# Define computational basis states
zero_state = np.array([[1], [0]]) # |0>
one_state = np.array([[0], [1]])  # |1>

# Define quantum gates
H = (1/np.sqrt(2)) * np.array([[1, 1], [1, -1]])
X = np.array([[0, 1], [1, 0]])

# Apply Hadamard gate to |0>
plus_state = np.dot(H, zero_state)
print("|+> State after H gate:\\n", plus_state)
"""
        }
    ],
    "Advanced TypeScript Design Patterns": [
        {
            "title": "TypeScript Advanced Types Mindmap",
            "type": "diagram",
            "content": json.dumps({
                "name": "TS Advanced Types",
                "children": [
                  {
                    "name": "Generic Constraints",
                    "children": [
                      {"name": "extends clause", "children": []},
                      {"name": "keyof operator", "children": []}
                    ]
                  },
                  {
                    "name": "Conditional Types",
                    "children": [
                      {"name": "infer extraction", "children": []},
                      {"name": "Distributive unions", "children": []}
                    ]
                  }
                ]
            })
        },
        {
            "title": "TypeScript Advanced Flashcards",
            "type": "document",
            "content": json.dumps([
                {"front": "Conditional Types", "back": "Allows choosing types based on condition: T extends U ? X : Y"},
                {"front": "Mapped Types", "back": "Iterates over keys of a type to create new keys and values: { [P in keyof T]: T[P] }"},
                {"front": "infer keyword", "back": "Introduces a type variable to be inferred within a conditional type clause."}
            ])
        },
        {
            "title": "TypeScript Type Utilities Cheatsheet",
            "type": "markdown",
            "content": """# TypeScript Type Utilities

## Extract Return Type of a Function
Using the `infer` keyword inside conditional types:
```typescript
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

const fetchUser = () => ({ id: 1, name: "Alice" });
type User = MyReturnType<typeof fetchUser>; // { id: number; name: string; }
```

## Distributive Conditional Types
Conditional types act on generic parameter union types:
```typescript
type ToArray<Type> = Type extends any ? Type[] : never;
type StrArrOrNumArr = ToArray<string | number>; // string[] | number[]
```
"""
        },
        {
            "title": "TypeScript Dynamic Event Handlers",
            "type": "code",
            "content": """type EventType = "click" | "hover" | "submit";
type HandlerName = `on${Capitalize<EventType>}`;

interface HandlerConfig {
  [key: string]: () => void;
}

// Ensure the config contains only valid handlers
type EventHandlers<T extends EventType> = {
  [K in T as `on${Capitalize<K>}`]: (event: { type: K; timestamp: number }) => void;
};
"""
        }
    ],
    "Mastering Neural Networks and Deep Learning": [
        {
            "title": "Deep Learning Architecture Mindmap",
            "type": "diagram",
            "content": json.dumps({
                "name": "Neural Networks",
                "children": [
                  {
                    "name": "Activation Functions",
                    "children": [
                      {"name": "Sigmoid", "children": []},
                      {"name": "ReLU", "children": []},
                      {"name": "Softmax", "children": []}
                    ]
                  },
                  {
                    "name": "Optimization",
                    "children": [
                      {"name": "Backpropagation", "children": []},
                      {"name": "Gradient Descent", "children": []}
                    ]
                  }
                ]
            })
        },
        {
            "title": "Deep Learning Vocabulary Flashcards",
            "type": "document",
            "content": json.dumps([
                {"front": "ReLU", "back": "Rectified Linear Unit activation function: f(x) = max(0, x)"},
                {"front": "Softmax", "back": "Normalizes logits into probability distribution: e^zi / sum(e^zj)"},
                {"front": "Self-Attention", "back": "Calculates how much attention tokens pay to each other using Queries, Keys, and Values."}
            ])
        },
        {
            "title": "Deep Learning Formulas Cheatsheet",
            "type": "markdown",
            "content": """# Deep Learning Formulas

## 1. Activation Functions
- **Sigmoid**:
  $$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$
- **ReLU (Rectified Linear Unit)**:
  $$f(z) = \\max(0, z)$$
- **Softmax**:
  $$\\text{Softmax}(z_i) = \\frac{e^{z_i}}{\\sum_{j} e^{z_j}}$$

## 2. Transformer Self-Attention
Self-attention maps queries ($Q$), keys ($K$), and values ($V$) to outputs:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
"""
        },
        {
            "title": "Python NumPy Self-Attention Implementation",
            "type": "code",
            "content": """import numpy as np

def softmax(x):
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / e_x.sum(axis=-1, keepdims=True)

def self_attention(Q, K, V):
    d_k = Q.shape[-1]
    scores = np.matmul(Q, K.T) / np.sqrt(d_k)
    weights = softmax(scores)
    return np.matmul(weights, V)
"""
        }
    ]
}

QUIZZES_MAPPING = {
    "Introduction to Quantum Computing": {
        "title": "Quantum Foundations Quiz",
        "difficulty": "medium",
        "questions": [
            {
                "question": "What is the probability of measuring state |0> for the qubit state: |psi> = 1/sqrt(2)|0> + 1/sqrt(2)|1>?",
                "options": {
                    "A": "0.25",
                    "B": "0.50",
                    "C": "0.75",
                    "D": "1.00"
                },
                "answer": "B"
            },
            {
                "question": "Which quantum gate acts as a controlled bit-flip operator?",
                "options": {
                    "A": "Hadamard",
                    "B": "Pauli-X",
                    "C": "CNOT",
                    "D": "Pauli-Z"
                },
                "answer": "C"
            }
        ]
    },
    "Advanced TypeScript Design Patterns": {
        "title": "TypeScript Advanced Types Quiz",
        "difficulty": "medium",
        "questions": [
            {
                "question": "What keyword is used inside a conditional type to declare a variable to be inferred?",
                "options": {
                    "A": "extends",
                    "B": "infer",
                    "C": "keyof",
                    "D": "typeof"
                },
                "answer": "B"
            },
            {
                "question": "Which of the following is distributive when passed a union type parameter?",
                "options": {
                    "A": "Generic constraint",
                    "B": "Mapped type",
                    "C": "Generic conditional type",
                    "D": "Template literal type"
                },
                "answer": "C"
            }
        ]
    },
    "Mastering Neural Networks and Deep Learning": {
        "title": "Deep Learning & Transformer Quiz",
        "difficulty": "medium",
        "questions": [
            {
                "question": "What is the formula for the standard self-attention mechanism?",
                "options": {
                    "A": "softmax(QK^T) * V",
                    "B": "softmax(QK^T / sqrt(d_k)) * V",
                    "C": "softmax(QW^T / d_k) * V",
                    "D": "sigmoid(QK^T) * V"
                },
                "answer": "B"
            },
            {
                "question": "Which activation function is defined as f(x) = max(0, x)?",
                "options": {
                    "A": "Sigmoid",
                    "B": "Tanh",
                    "C": "ReLU",
                    "D": "Softmax"
                },
                "answer": "C"
            }
        ]
    }
}

# ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────
def load_env():
    env_vars = {}
    for path in [".env.local", ".env"]:
        if os.path.exists(path):
            with open(path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        env_vars[key.strip()] = val.strip().strip("'\"")
            break
    return env_vars


def get_authenticated_session(url, anon_key):
    # Check if we can sign in or sign up
    print("*" * 60)
    print(" DATABASE SEEDER AUTHENTICATION")
    print("*" * 60)
    print("The database requires authentication to insert modules.")
    print("If you have already registered an account in the web app UI, please enter its credentials.")
    print("If you haven't, you can enter any email/password to attempt automatic sign up.")
    print("-" * 60)
    
    # Check environment variables first
    email = os.environ.get("SUPABASE_EMAIL")
    password = os.environ.get("SUPABASE_PASSWORD")
    
    if not email:
        email = input("Email: ").strip()
    if not password:
        password = getpass.getpass("Password: ").strip()
        
    if not email or not password:
        print("Email and Password are required.")
        sys.exit(1)
        
    login_url = f"{url}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": anon_key,
        "Content-Type": "application/json"
    }
    body = {
        "email": email,
        "password": password
    }
    
    # Try Login
    print("Logging in...")
    res = requests.post(login_url, headers=headers, json=body)
    if res.status_code == 200:
        print("Successfully logged in!")
        return res.json().get("access_token"), email
        
    # If login fails, try signing up
    print("Login failed. Attempting signup...")
    signup_url = f"{url}/auth/v1/signup"
    signup_res = requests.post(signup_url, headers=headers, json=body)
    if signup_res.status_code in (200, 201):
        signup_data = signup_res.json()
        token = signup_data.get("access_token")
        if token:
            print("Successfully signed up and authenticated!")
            return token, email
        else:
            print("\n[IMPORTANT] Signup succeeded, but email confirmation is required.")
            print("Please check your email inbox to confirm your account first, then run this script again.")
            sys.exit(1)
    else:
        print(f"Authentication failed: {signup_res.status_code} - {signup_res.text}")
        sys.exit(1)


# ─── MAIN IMPLEMENTATION ──────────────────────────────────────────────────────
def main():
    env = load_env()
    url = env.get("VITE_SUPABASE_URL")
    
    # Check for service role key
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    anon_key = env.get("VITE_SUPABASE_ANON_KEY")
    
    if not url:
        print("Error: VITE_SUPABASE_URL not found in environment or .env.local")
        sys.exit(1)
        
    print(f"Connecting to Supabase Project: {url}")
    
    using_service_key = False
    token = None
    email = None
    
    if service_role_key:
        print("Found SUPABASE_SERVICE_ROLE_KEY. Bypassing user authentication flow (admin/RLS bypass enabled)...")
        token = service_role_key
        using_service_key = True
        # Set a dummy identifier or fetch existing
        email = "system_seeder@openbalc.com"
    else:
        if not anon_key:
            print("Error: VITE_SUPABASE_ANON_KEY not found in environment or .env.local")
            sys.exit(1)
        # Fallback to interactive authentication
        token, email = get_authenticated_session(url, anon_key)
    
    # Build API Headers
    headers = {
        "apikey": token if using_service_key else anon_key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # 2. Get User Profile from public.users table or create/pick one
    user_id = None
    if using_service_key:
        # Since we bypass RLS, we can query all users
        print("Retrieving existing users list...")
        res_users = requests.get(f"{url}/rest/v1/users?select=id,email", headers=headers)
        if res_users.status_code == 200 and len(res_users.json()) > 0:
            user_data = res_users.json()[0]
            user_id = user_data["id"]
            email = user_data["email"]
            print(f"Found existing user '{email}' with ID: {user_id}. Using this user for seeding modules.")
        else:
            print("No users found in public.users. Creating a default seeder user profile...")
            profile_data = {
                "email": "system_seeder@openbalc.com",
                "display_name": "System Seeder",
                "username": "system_seeder",
                "role": "user"
            }
            res_ins_profile = requests.post(f"{url}/rest/v1/users", headers=headers, json=profile_data)
            if res_ins_profile.status_code in (200, 201):
                user_id = res_ins_profile.json()[0]["id"]
                print(f"Created new seeder user profile with ID: {user_id}")
            else:
                print(f"Failed to create seeder user profile: {res_ins_profile.status_code} - {res_ins_profile.text}")
                sys.exit(1)
    else:
        # Standard user workflow
        print(f"Checking profile in public.users for {email}...")
        res_profile = requests.get(f"{url}/rest/v1/users?email=eq.{email}", headers=headers)
        if res_profile.status_code == 200 and len(res_profile.json()) > 0:
            user_id = res_profile.json()[0]["id"]
            print(f"Found existing user profile with ID: {user_id}")
        else:
            print("Inserting user profile into public.users...")
            profile_data = {
                "email": email,
                "display_name": email.split("@")[0].title(),
                "username": email.split("@")[0].lower(),
                "role": "user"
            }
            res_ins_profile = requests.post(f"{url}/rest/v1/users", headers=headers, json=profile_data)
            if res_ins_profile.status_code in (200, 201):
                user_id = res_ins_profile.json()[0]["id"]
                print(f"Created new user profile with ID: {user_id}")
            else:
                print(f"Failed to create user profile: {res_ins_profile.status_code} - {res_ins_profile.text}")
                sys.exit(1)
            
    # 3. Retrieve Workspace or Create one
    workspace_id = None
    print("Checking for existing workspace memberships...")
    res_ws_member = requests.get(f"{url}/rest/v1/workspace_members?user_id=eq.{user_id}", headers=headers)
    if res_ws_member.status_code == 200 and len(res_ws_member.json()) > 0:
        workspace_id = res_ws_member.json()[0]["workspace_id"]
        print(f"Found active workspace ID: {workspace_id}")
    else:
        print("Creating default personal workspace...")
        ws_data = {
            "name": f"{email.split('@')[0].title()}'s Workspace",
            "owner_id": user_id
        }
        res_ws = requests.post(f"{url}/rest/v1/workspaces", headers=headers, json=ws_data)
        if res_ws.status_code in (200, 201):
            workspace_id = res_ws.json()[0]["id"]
            print(f"Created workspace with ID: {workspace_id}")
            
            # Associate user as owner of the workspace
            member_data = {
                "workspace_id": workspace_id,
                "user_id": user_id,
                "role": "owner"
            }
            requests.post(f"{url}/rest/v1/workspace_members", headers=headers, json=member_data)
        else:
            print("Failed to create workspace. Proceeding with workspace_id = NULL...")
            
    # 4. Insert Modules
    print("\nInjecting educational modules...")
    for mod in REAL_MODULES:
        title = mod["title"]
        subject = mod["subject"]
        description = mod["description"]
        topics = mod["topics"]
        
        # Check if module already exists to prevent duplication
        print(f"\nChecking if module '{title}' exists...")
        res_chk_mod = requests.get(f"{url}/rest/v1/modules?title=eq.{title}&user_id=eq.{user_id}", headers=headers)
        
        module_id = None
        if res_chk_mod.status_code == 200 and len(res_chk_mod.json()) > 0:
            module_id = res_chk_mod.json()[0]["id"]
            print(f"Module '{title}' already exists with ID: {module_id}.")
        else:
            print(f"Creating module '{title}'...")
            mod_data = {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "title": title,
                "description": description,
                "subject": subject,
                "visibility": "public",
                "method": "topic",
                "status": "active",
                "topic_count": len(topics),
                "chapter_count": len(topics)
            }
            
            res_mod = requests.post(f"{url}/rest/v1/modules", headers=headers, json=mod_data)
            if res_mod.status_code not in (200, 201):
                print(f"Failed to create module '{title}': {res_mod.status_code} - {res_mod.text}")
                continue
                
            module_id = res_mod.json()[0]["id"]
            print(f"Module created with ID: {module_id}")
            
            # 5. Insert Topics & Module Content
            for idx, t_data in enumerate(topics):
                name = t_data["name"]
                desc = t_data["description"]
                content = t_data["content"]
                
                print(f"  Adding topic: '{name}'...")
                topic_payload = {
                    "module_id": module_id,
                    "name": name,
                    "description": desc,
                    "order_index": idx
                }
                
                res_topic = requests.post(f"{url}/rest/v1/topics", headers=headers, json=topic_payload)
                if res_topic.status_code not in (200, 201):
                    print(f"  Failed to create topic '{name}': {res_topic.status_code} - {res_topic.text}")
                    continue
                    
                topic_id = res_topic.json()[0]["id"]
                
                # Insert Chapter Content
                print(f"    Adding chapter content for: '{content['chapter']}'...")
                content_payload = {
                    "module_id": module_id,
                    "topic_id": topic_id,
                    "chapter": content["chapter"],
                    "topic": name,
                    "content": content["body"],
                    "format": "markdown"
                }
                
                res_content = requests.post(f"{url}/rest/v1/module_content", headers=headers, json=content_payload)
                if res_content.status_code not in (200, 201):
                    print(f"    Failed to create chapter content: {res_content.status_code} - {res_content.text}")

        # Seeding Conversations & Artifacts linked to this module
        if module_id:
            # 1. Create or Find Conversation for this module
            conv_title = f"Study Guide Chat: {title}"
            print(f"  Checking if conversation '{conv_title}' exists...")
            res_chk_conv = requests.get(f"{url}/rest/v1/conversations?title=eq.{conv_title}&user_id=eq.{user_id}", headers=headers)
            
            conversation_id = None
            if res_chk_conv.status_code == 200 and len(res_chk_conv.json()) > 0:
                conversation_id = res_chk_conv.json()[0]["id"]
                print(f"  Conversation '{conv_title}' already exists with ID: {conversation_id}")
            else:
                print(f"  Creating conversation '{conv_title}'...")
                conv_payload = {
                    "user_id": user_id,
                    "workspace_id": workspace_id,
                    "title": conv_title,
                    "tagged_module_ids": [module_id]
                }
                res_conv = requests.post(f"{url}/rest/v1/conversations", headers=headers, json=conv_payload)
                if res_conv.status_code in (200, 201):
                    conversation_id = res_conv.json()[0]["id"]
                    print(f"  Conversation created with ID: {conversation_id}")
                else:
                    print(f"  Failed to create conversation: {res_conv.status_code} - {res_conv.text}")
            
            # 2. Seed Artifacts (if conversation is available)
            if conversation_id and title in ARTIFACTS_MAPPING:
                print(f"  Seeding artifacts for module '{title}'...")
                for art in ARTIFACTS_MAPPING[title]:
                    # Check if artifact exists
                    res_chk_art = requests.get(f"{url}/rest/v1/artifacts?title=eq.{art['title']}&conversation_id=eq.{conversation_id}", headers=headers)
                    if res_chk_art.status_code == 200 and len(res_chk_art.json()) > 0:
                        print(f"    Artifact '{art['title']}' already exists. Skipping.")
                    else:
                        print(f"    Creating artifact '{art['title']}' of type '{art['type']}'...")
                        art_payload = {
                            "user_id": user_id,
                            "workspace_id": workspace_id,
                            "conversation_id": conversation_id,
                            "title": art["title"],
                            "type": art["type"],
                            "content": art["content"],
                            "version": 1
                        }
                        res_art = requests.post(f"{url}/rest/v1/artifacts", headers=headers, json=art_payload)
                        if res_art.status_code not in (200, 201):
                            print(f"    Failed to create artifact '{art['title']}': {res_art.status_code} - {res_art.text}")

            # 3. Seed Practice Quizzes (test_sets and test_questions)
            if title in QUIZZES_MAPPING:
                quiz = QUIZZES_MAPPING[title]
                print(f"  Checking if quiz '{quiz['title']}' exists...")
                res_chk_quiz = requests.get(f"{url}/rest/v1/test_sets?module_id=eq.{module_id}&title=eq.{quiz['title']}", headers=headers)
                
                test_set_id = None
                if res_chk_quiz.status_code == 200 and len(res_chk_quiz.json()) > 0:
                    test_set_id = res_chk_quiz.json()[0]["id"]
                    print(f"  Quiz '{quiz['title']}' already exists with ID: {test_set_id}.")
                else:
                    print(f"  Creating quiz '{quiz['title']}'...")
                    test_payload = {
                        "module_id": module_id,
                        "workspace_id": workspace_id,
                        "title": quiz["title"],
                        "difficulty": quiz["difficulty"],
                        "created_by": user_id,
                        "source_title": "AI Seeder"
                    }
                    res_quiz = requests.post(f"{url}/rest/v1/test_sets", headers=headers, json=test_payload)
                    if res_quiz.status_code in (200, 201):
                        test_set_id = res_quiz.json()[0]["id"]
                        print(f"  Quiz test set created with ID: {test_set_id}")
                        
                        # Seed questions
                        for q in quiz["questions"]:
                            print(f"    Adding question: '{q['question'][:40]}...'")
                            question_payload = {
                                "test_set_id": test_set_id,
                                "type": "mcq",
                                "question": q["question"],
                                "options": q["options"],
                                "answer": q["answer"]
                            }
                            res_q = requests.post(f"{url}/rest/v1/test_questions", headers=headers, json=question_payload)
                            if res_q.status_code not in (200, 201):
                                print(f"    Failed to create question: {res_q.status_code} - {res_q.text}")
                    else:
                        print(f"  Failed to create quiz test set: {res_quiz.status_code} - {res_quiz.text}")

    print("\nDatabase seeding completed successfully!")


if __name__ == "__main__":
    main()
