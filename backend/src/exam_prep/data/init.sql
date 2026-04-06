-- Exam prep seed data
-- Analytical Geometry and Linear Algebra - 7 weeks of topics

-- Tables

CREATE TABLE IF NOT EXISTS topic (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(128) NOT NULL UNIQUE,
    title VARCHAR(256) NOT NULL,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS task (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    difficulty VARCHAR(16) NOT NULL DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS theory (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL
);

-- Seed data

-- Topics

INSERT INTO topic (id, slug, title, description) VALUES
(1, 'gauss-elimination',
 'Gauss elimination and the geometry of linear equations',
 'Solving systems of linear equations using Gaussian elimination, row operations, and the geometric interpretation of solutions.'),

(2, 'matrix-operations',
 'Matrix operations and inverses',
 'Matrix addition, multiplication, transpose, and computing the inverse of a matrix.'),

(3, 'lu-factorization',
 'LU and LDU factorization. Transposes and permutations',
 'Decomposing a matrix into lower and upper triangular factors, permutation matrices.'),

(4, 'vector-spaces',
 'Vector spaces, subspaces, and solving Ax = 0, Ax = b',
 'Null space, column space, row reduced echelon form, matrix rank, basis and dimension.'),

(5, 'four-subspaces',
 'The four fundamental subspaces and orthogonality',
 'Column space, null space, row space, left null space. Orthogonal vectors and subspaces.'),

(6, 'projections-least-squares',
 'Projections, least squares, and regression',
 'Projection matrices, orthogonal projections, least squares approximation, linear regression.'),

(7, 'eigenvalues',
 'Eigenvalues and eigenvectors',
 'Computing eigenvalues and eigenvectors, diagonalization, the QR algorithm, difference equations.');

-- Reset sequence
SELECT setval('topic_id_seq', 7);

-- ─── Tasks ───────────────────────────────────────────────────────────────────

-- Topic 1: Gauss elimination (3 tasks)
INSERT INTO task (topic_id, question, answer, explanation, difficulty) VALUES
(1,
 'Solve the system using Gauss elimination: 2x + y = 5, 4x + 3y = 11. Find x.',
 'x = 2',
 'Row reduce: R2 ← R2 − 2·R1 gives 2x + y = 5, y = 1. Then x = (5 − 1)/2 = 2.',
 'easy'),

(1,
 'After applying Gauss elimination to a 3×3 system, the row-echelon form has a row of all zeros in the coefficient part and 0 in the right-hand side. How many solutions does the system have?',
 'Infinitely many',
 'A row of all zeros (including the RHS) indicates a free variable, meaning infinitely many solutions.',
 'medium'),

(1,
 'Perform the first elimination step on the system: x + 2y + z = 3, 3x + 4y + 2z = 7, 2x + y + 3z = 5. What is the new coefficient of y in the second row after eliminating x?',
 '-2',
 'R2 ← R2 − 3·R1: the new y-coefficient is 4 − 3·2 = −2.',
 'hard');

-- Topic 2: Matrix operations (2 tasks)
INSERT INTO task (topic_id, question, answer, explanation, difficulty) VALUES
(2,
 'Find the inverse of the matrix [[2, 1], [5, 3]]. What is the element in position (1,1)?',
 '3',
 'det = 2·3 − 1·5 = 1. A⁻¹ = (1/det) · [[3, −1], [−5, 2]]. Element (1,1) = 3.',
 'medium'),

(2,
 'If A is a 3×3 matrix and det(A) = 2, what is det(3A)?',
 '54',
 'For an n×n matrix, det(kA) = kⁿ·det(A). Here n=3, k=3: det(3A) = 27·2 = 54.',
 'hard');

-- Topic 3: LU factorization (2 tasks)
INSERT INTO task (topic_id, question, answer, explanation, difficulty) VALUES
(3,
 'Find the L matrix in the LU decomposition of A = [[2, 1], [6, 5]]. What is L[2,1] (the multiplier)?',
 '3',
 'The multiplier to eliminate A[2,1] is 6/2 = 3. So L = [[1, 0], [3, 1]].',
 'medium'),

(3,
 'In the LU decomposition with partial pivoting, what type of matrix P is used in PA = LU?',
 'Permutation matrix',
 'P is a permutation matrix that reorders the rows of A to avoid zero pivots.',
 'easy');

-- Topic 4: Vector spaces (3 tasks)
INSERT INTO task (topic_id, question, answer, explanation, difficulty) VALUES
(4,
 'Find the dimension of the null space of the matrix A = [[1, 2, 3], [2, 4, 6]].',
 '2',
 'The two rows are linearly dependent, so rank(A) = 1. By rank-nullity: nullity = 3 − 1 = 2.',
 'medium'),

(4,
 'What is the row reduced echelon form (RREF) of [[1, 2], [3, 6]]?',
 '[[1, 2], [0, 0]]',
 'R2 ← R2 − 3·R1 gives [[1, 2], [0, 0]]. Already in RREF.',
 'hard'),

(4,
 'If vectors v1 = (1, 0, 1) and v2 = (0, 1, 1) are in R³, what is their span?',
 'A plane in R³',
 'Two linearly independent vectors in R³ span a 2-dimensional subspace, i.e., a plane.',
 'easy');

-- Topic 5: Four subspaces (2 tasks)
INSERT INTO task (topic_id, question, answer, explanation, difficulty) VALUES
(5,
 'For a 3×4 matrix A with rank 2, what is the dimension of the left null space?',
 '1',
 'The left null space has dimension m − r = 3 − 2 = 1.',
 'medium'),

(5,
 'If vector x is in the null space of A and vector y is in the row space of A, what is x·y?',
 '0',
 'The null space and row space are orthogonal complements in Rⁿ, so any vector from one is orthogonal to any vector from the other.',
 'easy');

-- Topic 6: Projections and least squares (2 tasks)
INSERT INTO task (topic_id, question, answer, explanation, difficulty) VALUES
(6,
 'What is the projection matrix P onto the line spanned by vector a = (1, 0)?',
 '[[1, 0], [0, 0]]',
 'P = aaᵀ / (aᵀa). Here aᵀa = 1, aaᵀ = [[1,0],[0,0]]. So P = [[1,0],[0,0]].',
 'hard'),

(6,
 'In least squares regression, what equation do we solve to find the best x in Ax ≈ b?',
 'AᵀAx = Aᵀb',
 'The normal equations AᵀAx = Aᵀb give the least squares solution.',
 'easy');

-- Topic 7: Eigenvalues (2 tasks)
INSERT INTO task (topic_id, question, answer, explanation, difficulty) VALUES
(7,
 'Find the eigenvalues of the matrix [[3, 0], [0, 7]]. List them separated by comma.',
 '3, 7',
 'For a diagonal matrix, the eigenvalues are the diagonal entries: 3 and 7.',
 'easy'),

(7,
 'If λ = 2 is an eigenvalue of matrix A with eigenvector v = (1, 1), what is A·v?',
 '(2, 2)',
 'By definition Av = λv = 2·(1,1) = (2,2).',
 'medium');

-- ─── Theory ──────────────────────────────────────────────────────────────────

INSERT INTO theory (topic_id, title, content) VALUES
(1,
 'Gauss elimination: step-by-step guide',
 'Gauss elimination transforms a system of linear equations into row-echelon form using three elementary row operations:
1. Swap two rows
2. Multiply a row by a non-zero scalar
3. Add a multiple of one row to another

**Forward elimination:** Starting from the first column, use the pivot to eliminate all entries below it. Move to the next column and repeat.

**Back substitution:** Once in row-echelon form, solve from the last equation upward.

A system can have: one unique solution (full rank), no solution (inconsistent), or infinitely many solutions (free variables).'),

(2,
 'Matrix inverse: when and how',
 'A square matrix A is invertible if and only if det(A) ≠ 0.

For a 2×2 matrix [[a,b],[c,d]]: A⁻¹ = (1/det) · [[d,−b],[−c,a]]

For larger matrices, use Gauss-Jordan elimination: augment [A | I] and row-reduce to [I | A⁻¹].

Properties:
- (AB)⁻¹ = B⁻¹A⁻¹
- (A⁻¹)⁻¹ = A
- (Aᵀ)⁻¹ = (A⁻¹)ᵀ'),

(3,
 'LU decomposition',
 'The LU decomposition factors a matrix A = L·U where L is lower triangular (with 1s on the diagonal) and U is upper triangular.

To find L and U, perform Gaussian elimination. The multipliers used to eliminate entries become the entries of L.

When pivoting is needed: PA = LU, where P is a permutation matrix.

LU decomposition is useful for solving multiple systems with the same A but different right-hand sides, since forward/backward substitution is faster than full elimination.'),

(4,
 'Vector spaces and the four key concepts',
 'A **vector space** is a set closed under addition and scalar multiplication.

**Null space N(A):** all x such that Ax = 0. Found by solving the homogeneous system.

**Column space C(A):** all linear combinations of columns of A. Dimension = rank(A).

**Rank:** the number of pivot columns. By the rank-nullity theorem: rank + nullity = n (number of columns).

**Row reduced echelon form (RREF):** unique form with leading 1s and zeros above and below each pivot.'),

(5,
 'The four fundamental subspaces',
 'For an m×n matrix A of rank r:

1. **Column space C(A)** — subspace of Rᵐ, dimension r
2. **Null space N(A)** — subspace of Rⁿ, dimension n−r
3. **Row space C(Aᵀ)** — subspace of Rⁿ, dimension r
4. **Left null space N(Aᵀ)** — subspace of Rᵐ, dimension m−r

Key orthogonalities:
- N(A) ⊥ C(Aᵀ)  (null space ⊥ row space)
- N(Aᵀ) ⊥ C(A)  (left null space ⊥ column space)

These pairs are orthogonal complements.'),

(6,
 'Projections and least squares',
 '**Projection of b onto a:** p = (aᵀb / aᵀa) · a

**Projection matrix onto column space of A:** P = A(AᵀA)⁻¹Aᵀ

**Least squares:** When Ax = b has no solution, find x̂ minimizing ||Ax − b||².

The normal equations: AᵀAx̂ = Aᵀb

This is the foundation of **linear regression**: finding the best-fit line through noisy data points.'),

(7,
 'Eigenvalues and eigenvectors',
 'A non-zero vector v is an **eigenvector** of A if Av = λv for some scalar λ (the **eigenvalue**).

To find eigenvalues: solve det(A − λI) = 0 (the characteristic equation).

To find eigenvectors: for each λ, solve (A − λI)v = 0.

**Diagonalization:** If A has n independent eigenvectors, then A = SΛS⁻¹ where Λ is diagonal (eigenvalues) and S has eigenvectors as columns.

A matrix is diagonalizable if and only if it has n linearly independent eigenvectors.');

-- Reset sequences
SELECT setval('task_id_seq', (SELECT MAX(id) FROM task));
SELECT setval('theory_id_seq', (SELECT MAX(id) FROM theory));
