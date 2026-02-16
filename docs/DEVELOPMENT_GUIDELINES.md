# MotivAid - Development Guidelines

## Getting Started

### Prerequisites
- Flutter SDK 3.10.7+
- Dart SDK 3.0+
- Android Studio / VS Code
- Git

### Setup
```bash
# Clone repository
git clone https://github.com/user/motivaid.git
cd motivaid

# Install dependencies
flutter pub get

# Run the app
flutter run
```

---

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── app.dart                  # App widget & routing
│
├── core/                     # Core utilities
│   ├── config/
│   │   ├── app_config.dart   # Environment config
│   │   └── supabase_config.dart
│   ├── constants/
│   │   ├── app_constants.dart
│   │   ├── colors.dart
│   │   └── strings.dart
│   ├── errors/
│   │   ├── exceptions.dart
│   │   └── failures.dart
│   ├── network/
│   │   ├── network_info.dart
│   │   └── api_client.dart
│   ├── storage/
│   │   ├── local_storage.dart
│   │   └── secure_storage.dart
│   ├── theme/
│   │   ├── app_theme.dart
│   │   └── text_styles.dart
│   └── utils/
│       ├── validators.dart
│       └── formatters.dart
│
├── features/                 # Feature modules
│   ├── auth/
│   │   ├── data/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   └── sources/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── usecases/
│   │   └── presentation/
│   │       ├── providers/
│   │       ├── screens/
│   │       └── widgets/
│   ├── clinical/
│   ├── training/
│   ├── reports/
│   └── settings/
│
├── shared/                   # Shared components
│   ├── models/
│   ├── widgets/
│   ├── providers/
│   └── services/
│
└── l10n/                     # Localization
```

---

## Coding Standards

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | snake_case | `login_screen.dart` |
| Classes | PascalCase | `LoginScreen` |
| Variables | camelCase | `userName` |
| Constants | camelCase | `maxRetries` |
| Enums | PascalCase | `UserRole.midwife` |
| Providers | camelCase + Provider | `authProvider` |

### File Organization
```dart
// 1. Imports (sorted alphabetically within groups)
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/colors.dart';
import '../providers/auth_provider.dart';

// 2. Part directives (if using freezed/json_serializable)
part 'user_model.freezed.dart';
part 'user_model.g.dart';

// 3. Constants
const _kAnimationDuration = Duration(milliseconds: 300);

// 4. Main class
class LoginScreen extends ConsumerWidget {
  // ...
}

// 5. Private helper classes/widgets
class _LoginButton extends StatelessWidget {
  // ...
}
```

---

## State Management (Riverpod)

### Provider Types
```dart
// Simple state
final counterProvider = StateProvider<int>((ref) => 0);

// Async data
final userProvider = FutureProvider<User>((ref) async {
  return ref.read(authRepositoryProvider).getCurrentUser();
});

// Notifier for complex state
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider));
});
```

### Provider Structure
```dart
// providers/auth_provider.dart
@riverpod
class Auth extends _$Auth {
  @override
  AuthState build() => const AuthState.initial();

  Future<void> login(String email, String password) async {
    state = const AuthState.loading();
    try {
      final user = await ref.read(authRepositoryProvider).login(email, password);
      state = AuthState.authenticated(user);
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }
}
```

---

## Error Handling

### Exception Classes
```dart
// core/errors/exceptions.dart
class ServerException implements Exception {
  final String message;
  final int? statusCode;
  
  ServerException(this.message, {this.statusCode});
}

class CacheException implements Exception {
  final String message;
  CacheException(this.message);
}

class NetworkException implements Exception {}
```

### Failure Classes
```dart
// core/errors/failures.dart
sealed class Failure {
  final String message;
  const Failure(this.message);
}

class ServerFailure extends Failure {
  const ServerFailure(super.message);
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}
```

---

## Testing

### Test Structure
```
test/
├── unit/
│   ├── features/
│   │   └── auth/
│   │       ├── data/
│   │       │   └── repositories/
│   │       └── domain/
│   │           └── usecases/
│   └── core/
├── widget/
│   └── features/
│       └── auth/
│           └── presentation/
│               └── screens/
└── integration/
    └── auth_flow_test.dart
```

### Running Tests
```bash
# All tests
flutter test

# With coverage
flutter test --coverage

# Specific test
flutter test test/unit/features/auth/
```

### Test Example
```dart
void main() {
  group('LoginUseCase', () {
    late LoginUseCase useCase;
    late MockAuthRepository mockRepository;

    setUp(() {
      mockRepository = MockAuthRepository();
      useCase = LoginUseCase(mockRepository);
    });

    test('should return User when login is successful', () async {
      // Arrange
      when(mockRepository.login(any, any))
          .thenAnswer((_) async => testUser);

      // Act
      final result = await useCase('test@email.com', 'password');

      // Assert
      expect(result, equals(testUser));
      verify(mockRepository.login('test@email.com', 'password')).called(1);
    });
  });
}
```

---

## Git Workflow

### Branch Naming
```
feature/auth-login
bugfix/pph-timer-issue
hotfix/critical-alert-fix
release/v1.0.0
```

### Commit Messages
```
feat: add E-MOTIVE checklist screen
fix: resolve shock index calculation error
docs: update API documentation
refactor: extract timer widget
test: add login usecase tests
chore: update dependencies
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests pass
- [ ] Widget tests pass
- [ ] Manual testing completed

## Screenshots
If applicable
```

---

## Performance Guidelines

1. **Use `const` constructors** where possible
2. **Avoid rebuilds** - use `select` with Riverpod
3. **Lazy load** screens and heavy widgets
4. **Optimize images** - use WebP format
5. **Minimize main thread work** - use isolates for heavy computation

---

## Accessibility

1. Use semantic widgets (`Semantics`, `MergeSemantics`)
2. Ensure sufficient color contrast
3. Support large text sizes
4. Provide text alternatives for icons
5. Test with TalkBack/VoiceOver
