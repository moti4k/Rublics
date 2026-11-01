//
//  AuthView.swift
//  Rubliks
//

import SwiftUI

struct AuthView: View {
    @ObservedObject var appState: AppState
    @State private var isRegistration = true
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var displayName = ""
    @State private var errorMessage: String?
    @State private var showError = false

    var body: some View {
        ZStack(alignment: .topLeading) {
            AppTheme.backgroundLightGray.ignoresSafeArea()

            VStack(spacing: 0) {
                headerView
                modeSwitch
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {
                        if isRegistration {
                            registrationCard
                        } else {
                            loginCard
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 50)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .alert("Ошибка", isPresented: $showError) {
            Button("OK", role: .cancel) { showError = false }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private var headerView: some View {
        ZStack(alignment: .leading) {
            AppTheme.accentRed
                .frame(height: 160)
                .clipShape(
                    .rect(
                        topLeadingRadius: 0,
                        bottomLeadingRadius: 0,
                        bottomTrailingRadius: 40,
                        topTrailingRadius: 0
                    )
                )
            VStack(alignment: .leading, spacing: 4) {
                Text("ПРИВЕТ!")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)
                Text("ДОБРО ПОЖАЛОВАТЬ В РУБЛИКС")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white.opacity(0.95))
            }
            .padding(.leading, 24)
            .padding(.top, 56)
        }
        .frame(height: 160)
    }

    private var modeSwitch: some View {
        HStack(spacing: 12) {
            Button {
                isRegistration = false
                errorMessage = nil
            } label: {
                Text("Войти")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(isRegistration ? Color(white: 0.5) : .white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(isRegistration ? Color(white: 0.9) : AppTheme.accentRed)
                    .cornerRadius(12)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Button {
                isRegistration = true
                errorMessage = nil
            } label: {
                Text("Регистрация")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(isRegistration ? .white : Color(white: 0.5))
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(isRegistration ? AppTheme.accentRed : Color(white: 0.9))
                    .cornerRadius(12)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }

    private var registrationCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Создайте аккаунт")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            TextField("Email", text: $email)
                .textFieldStyle(AuthTextFieldStyle())
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)
            SecureField("Пароль (минимум 4 символа)", text: $password)
                .textFieldStyle(AuthTextFieldStyle())
                .textContentType(.newPassword)
            SecureField("Повторите пароль", text: $confirmPassword)
                .textFieldStyle(AuthTextFieldStyle())
                .textContentType(.newPassword)
            TextField("Как к вам обращаться?", text: $displayName)
                .textFieldStyle(AuthTextFieldStyle())
                .textContentType(.name)
            Button(action: doRegister) {
                Text("ЗАРЕГИСТРИРОВАТЬСЯ")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
            .padding(.top, 8)
        }
        .padding(24)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 4)
    }

    private var loginCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Вход в аккаунт")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            TextField("Email", text: $email)
                .textFieldStyle(AuthTextFieldStyle())
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)
            SecureField("Пароль", text: $password)
                .textFieldStyle(AuthTextFieldStyle())
                .textContentType(.password)
            Button("Забыли пароль?") {}
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(AppTheme.accentRed)
            Button(action: doLogin) {
                Text("ВОЙТИ")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
            .padding(.top, 8)
        }
        .padding(24)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 4)
    }

    private func doLogin() {
        errorMessage = nil
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !password.isEmpty else {
            errorMessage = "Введите email и пароль"
            showError = true
            return
        }
        if UserStorage.login(email: trimmedEmail, password: password) {
            appState.finishAuth()
        } else {
            errorMessage = "Неверный email или пароль"
            showError = true
        }
    }

    private func doRegister() {
        errorMessage = nil
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else {
            errorMessage = "Введите email"
            showError = true
            return
        }
        guard password.count >= 4 else {
            errorMessage = "Пароль должен быть не короче 4 символов"
            showError = true
            return
        }
        guard password == confirmPassword else {
            errorMessage = "Пароли не совпадают"
            showError = true
            return
        }
        if UserStorage.register(email: trimmedEmail, password: password, displayName: displayName.trimmingCharacters(in: .whitespacesAndNewlines)) {
            appState.finishAuth()
        } else {
            errorMessage = "Такой email уже зарегистрирован"
            showError = true
        }
    }
}

struct AuthTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(Color(white: 0.2))
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(Color(white: 0.97))
            .cornerRadius(AppTheme.buttonCornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.buttonCornerRadius)
                    .stroke(Color.gray.opacity(0.25), lineWidth: 1)
            )
    }
}
