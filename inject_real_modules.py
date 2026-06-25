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
            print(f"Module '{title}' already exists with ID: {module_id}. Skipping creation.")
            continue
            
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

    print("\nDatabase seeding completed successfully!")


if __name__ == "__main__":
    main()
