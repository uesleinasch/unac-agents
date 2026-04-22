# Code Review Skills - Implementation Guide

## Overview

This guide explains how to integrate the code review skills into your terminal virtual intelligence agent. These skills are designed to be modular, composable, and easy to maintain.

## File Structure

```
.agent/
├── skills/
│   ├── code-review/
│   │   ├── SKILL.md                    # Master skill (main entry point)
│   │   ├── security-review.md          # Security analysis sub-skill
│   │   ├── performance-review.md       # Performance optimization sub-skill
│   │   ├── architecture-review.md      # Architecture & design patterns
│   │   ├── test-review.md              # Test quality & coverage
│   │   └── language-specific/
│   │       ├── python-review.md        # Python-specific best practices
│   │       ├── javascript-review.md    # JavaScript/TypeScript specifics
│   │       ├── java-review.md          # Java-specific patterns
│   │       └── go-review.md            # Go idioms and conventions
│   └── README.md                       # This file
```

## Quick Start

### 1. Basic Setup

Copy all skill files into your `.agent/skills/code-review/` directory:

```bash
mkdir -p .agent/skills/code-review/language-specific
cp SKILL.md .agent/skills/code-review/
cp security-review.md .agent/skills/code-review/
cp performance-review.md .agent/skills/code-review/
cp architecture-review.md .agent/skills/code-review/
cp test-review.md .agent/skills/code-review/
```

### 2. Basic Usage

The master skill (`SKILL.md`) automatically activates when code is provided for review:

```bash
# Automatic activation
your-agent review my-file.py

# Explicit activation
your-agent @code-review analyze this function

# With specific focus
your-agent @code-review --focus=security review auth.js
```

### 3. Using Sub-Skills

Activate specific sub-skills for focused analysis:

```bash
# Security-focused review
your-agent @security-review check login.py

# Performance analysis
your-agent @performance-review optimize query.sql

# Architecture evaluation
your-agent @architecture-review evaluate user-service.ts

# Test quality check
your-agent @test-review analyze user.test.js
```

## How Skills Work Together

### Hierarchical Structure

```
Code Review Master (SKILL.md)
├── Provides comprehensive overview
├── Coordinates sub-skills
└── Delegates specialized analysis to:
    ├── Security Review (deep security analysis)
    ├── Performance Review (optimization focus)
    ├── Architecture Review (design patterns)
    └── Test Review (test quality)
```

### Composition Example

When you request a comprehensive review:

```bash
your-agent @code-review --depth=comprehensive review payment-service.py
```

The agent will:
1. Start with master skill for overall assessment
2. Invoke security review for payment-related security
3. Call performance review for query optimization
4. Use architecture review for design patterns
5. Apply test review if tests are present
6. Synthesize results into unified report

## Configuration Options

### Depth Levels

```bash
# Quick (2-3 minutes): Surface-level issues only
--depth=quick

# Standard (5-10 minutes): Balanced analysis (default)
--depth=standard

# Comprehensive (15-30 minutes): Deep dive with all sub-skills
--depth=comprehensive
```

### Focus Areas

```bash
# Emphasize specific aspect
--focus=security      # OWASP, vulnerabilities, auth
--focus=performance   # Bottlenecks, complexity, optimization
--focus=architecture  # SOLID, patterns, design
--focus=testing       # Coverage, quality, strategy
```

### Strictness Levels

```bash
# Standard enforcement
# (default)

# Strict mode: Treat warnings as errors
--strict

# Educational mode: More explanations and examples
--educational
```

## Customization

### Adding Custom Rules

Create a `custom-rules.md` file in the same directory:

```markdown
# Custom Review Rules

## Company-Specific Standards

### Naming Conventions
- All API endpoints must start with `/api/v{version}/`
- Database tables must use snake_case
- Classes must use PascalCase

### Required Patterns
- All database queries must use ORM
- All API responses must include request_id
- All errors must extend BaseError class

### Forbidden Patterns
- No `eval()` or similar dynamic execution
- No direct database access from controllers
- No synchronous file operations in Node.js
```

The master skill will automatically load and apply custom rules when present.

### Language-Specific Sub-Skills

Create focused language skills in `language-specific/` directory:

**Example: `python-review.md`**
```markdown
# Python-Specific Code Review

## PEP 8 Compliance
- Line length: 79 characters for code, 72 for docstrings
- Imports: Standard library, third-party, local
- Whitespace: 4 spaces per indentation level

## Python Idioms
- Use list comprehensions over map/filter
- Use context managers for resource handling
- Prefer `with` statements for file operations
- Use `pathlib` over `os.path`

## Type Hints
- All function signatures should have type hints
- Use `typing` module for complex types
- Prefer `Optional[T]` over `Union[T, None]`

## Common Issues
- Mutable default arguments
- Bare except clauses
- Using `==` for None comparison (use `is`)
```

## Integration Patterns

### Pattern 1: Progressive Enhancement

Start simple, add complexity as needed:

```bash
# Step 1: Basic review
your-agent @code-review quick-scan *.py

# Step 2: Address critical issues, then deep dive
your-agent @code-review --focus=security payment.py

# Step 3: Full comprehensive review
your-agent @code-review --depth=comprehensive --all-files
```

### Pattern 2: CI/CD Integration

```yaml
# .github/workflows/code-review.yml
name: AI Code Review

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: AI Code Review
        run: |
          your-agent @code-review --format=json \
            --output=review-results.json \
            $(git diff --name-only origin/main)
      - name: Post Comments
        run: |
          # Parse review-results.json and post to PR
```

### Pattern 3: Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running AI code review..."

# Get staged files
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(py|js|ts|java|go)$')

if [ -n "$FILES" ]; then
    your-agent @code-review --quick $FILES
    
    if [ $? -ne 0 ]; then
        echo "Code review found critical issues. Commit aborted."
        echo "Run: your-agent @code-review $FILES for details"
        exit 1
    fi
fi

exit 0
```

### Pattern 4: IDE Integration

Many terminal AI agents can integrate with editors:

**VS Code:**
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "AI Code Review",
      "type": "shell",
      "command": "your-agent @code-review ${file}",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

## Best Practices

### 1. Start with Master Skill

Always begin with the master skill for a balanced overview:
```bash
your-agent @code-review initial-review.py
```

### 2. Use Sub-Skills for Deep Dives

Once you identify areas of concern, use specialized skills:
```bash
# Master skill found potential security issues
your-agent @security-review deep-dive auth.py
```

### 3. Iterate Based on Feedback

Implement fixes, then re-review:
```bash
# Initial review
your-agent @code-review feature.py > review-1.md

# Fix issues
# ... make changes ...

# Re-review
your-agent @code-review feature.py > review-2.md

# Compare improvements
diff review-1.md review-2.md
```

### 4. Maintain Context

For large codebases, provide context:
```bash
your-agent @code-review --context="E-commerce checkout flow" \
  --related-files="cart.py,payment.py,inventory.py" \
  checkout.py
```

### 5. Learn from Reviews

Treat reviews as learning opportunities:
```bash
# Request educational explanations
your-agent @code-review --educational \
  --explain-patterns \
  complex-algorithm.py
```

## Output Formats

### Markdown (Default)
Human-readable format with sections and highlights

### JSON (CI/CD)
```bash
your-agent @code-review --format=json file.py
```

```json
{
  "summary": "...",
  "quality_score": 85,
  "issues": [
    {
      "severity": "critical",
      "type": "security",
      "line": 42,
      "message": "...",
      "fix": "..."
    }
  ]
}
```

### SARIF (Security)
For security-focused reviews compatible with GitHub Security:
```bash
your-agent @security-review --format=sarif auth.py
```

## Troubleshooting

### Skill Not Activating

1. **Check file location**: Skills must be in `.agent/skills/code-review/`
2. **Verify markdown format**: File must be valid Markdown
3. **Check activation triggers**: Use explicit `@code-review` if auto-activation fails

### Inconsistent Results

1. **Provide more context**: Use `--context` flag
2. **Specify language**: Use `--language=python` to override detection
3. **Check custom rules**: Ensure custom rules don't conflict

### Performance Issues

1. **Use targeted reviews**: Review specific files instead of entire codebase
2. **Adjust depth**: Start with `--depth=quick` for large files
3. **Cache results**: Enable result caching if available in your agent

### Sub-Skill Not Loading

1. **Explicit activation**: Use `@security-review` instead of relying on auto-detection
2. **Check dependencies**: Ensure master skill is loaded first
3. **Review file paths**: Sub-skills should reference correct parent skill

## Advanced Configuration

### Environment Variables

```bash
# Set default review depth
export AGENT_REVIEW_DEPTH=standard

# Set default focus areas
export AGENT_REVIEW_FOCUS=security,performance

# Enable strict mode by default
export AGENT_REVIEW_STRICT=true

# Custom rules location
export AGENT_CUSTOM_RULES=~/.agent/custom-review-rules.md
```

### Configuration File

Create `.agent/config.yml`:

```yaml
code_review:
  default_depth: standard
  auto_activate: true
  focus_areas:
    - security
    - performance
  
  strictness: normal
  educational_mode: false
  
  language_overrides:
    "*.tsx": typescript
    "*.jsx": javascript
  
  ignore_patterns:
    - "*.min.js"
    - "*.generated.*"
    - "node_modules/**"
  
  custom_rules: ./custom-rules.md
```

## Examples

### Example 1: Quick Security Check

```bash
your-agent @security-review --quick payment-processor.py
```

Output focuses on OWASP Top 10 vulnerabilities in payment code.

### Example 2: Performance Optimization

```bash
your-agent @performance-review --with-profiling database-queries.py
```

Output includes complexity analysis and optimization suggestions.

### Example 3: Architecture Refactoring

```bash
your-agent @architecture-review --suggest-patterns user-service.ts
```

Output identifies design pattern opportunities and SOLID violations.

### Example 4: Test Coverage Improvement

```bash
your-agent @test-review --show-gaps user-controller.test.js
```

Output highlights untested code paths and edge cases.

## Maintenance

### Keeping Skills Updated

```bash
# Pull latest skill definitions
cd .agent/skills/code-review
git pull origin main

# Or manually update individual files
curl -O https://your-repo/code-review/SKILL.md
```

### Adding New Sub-Skills

1. Create new skill file: `new-skill-review.md`
2. Follow the sub-skill template structure
3. Reference parent skill: `Code Review Master`
4. Add activation triggers
5. Update this README with usage examples

### Skill Versioning

Track skill versions in each file:
```markdown
**Version**: 1.2.0
```

Update version when making significant changes:
- Major (1.x.x): Breaking changes to format or triggers
- Minor (x.2.x): New features or analysis capabilities
- Patch (x.x.3): Bug fixes and clarifications

## Support & Contribution

### Getting Help

1. Check troubleshooting section above
2. Review skill documentation in each file
3. Run with `--verbose` flag for debugging

### Contributing Improvements

1. Test changes thoroughly on diverse codebases
2. Follow existing skill structure and formatting
3. Update version numbers appropriately
4. Add examples to this guide

### Sharing Custom Skills

Share language-specific or domain-specific skills:

```bash
# Export your custom skills
tar -czf my-custom-skills.tar.gz language-specific/

# Share with team
# Others can extract and use
```

## Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **SOLID Principles**: https://en.wikipedia.org/wiki/SOLID
- **Design Patterns**: Gang of Four patterns
- **Test Pyramid**: Martin Fowler's testing strategies
- **Clean Code**: Robert C. Martin principles

---

**Note**: These skills are designed to augment, not replace, human code review. The best results come from combining AI analysis with developer expertise and judgment.