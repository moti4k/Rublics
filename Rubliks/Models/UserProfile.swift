//
//  UserProfile.swift
//  Rubliks
//

import Foundation

struct UserProfile: Codable, Equatable {
    var email: String
    var displayName: String
    var createdAt: Date

    static let key = "currentUserProfile"
}

/// Локальный аккаунт для входа (пароль хранится локально, только для демо).
struct LocalAccount: Codable, Equatable {
    var email: String
    var password: String
    var displayName: String
    var createdAt: Date
}

enum UserStorage {
    private static let accountsKey = "savedAccounts"

    static func saveAccounts(_ accounts: [LocalAccount]) {
        guard let data = try? JSONEncoder().encode(accounts) else { return }
        UserDefaults.standard.set(data, forKey: accountsKey)
    }

    static func loadAccounts() -> [LocalAccount] {
        guard let data = UserDefaults.standard.data(forKey: accountsKey),
              let decoded = try? JSONDecoder().decode([LocalAccount].self, from: data) else { return [] }
        return decoded
    }

    static func findAccount(email: String, password: String) -> LocalAccount? {
        loadAccounts().first { $0.email.lowercased() == email.lowercased() && $0.password == password }
    }

    static func register(email: String, password: String, displayName: String) -> Bool {
        let normalized = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty, !password.isEmpty else { return false }
        var accounts = loadAccounts()
        if accounts.contains(where: { $0.email.lowercased() == normalized }) { return false }
        let account = LocalAccount(email: normalized, password: password, displayName: displayName.isEmpty ? normalized : displayName, createdAt: Date())
        accounts.append(account)
        saveAccounts(accounts)
        let profile = UserProfile(email: account.email, displayName: account.displayName, createdAt: account.createdAt)
        profile.saveAsCurrent()
        return true
    }

    static func login(email: String, password: String) -> Bool {
        guard let account = findAccount(email: email, password: password) else { return false }
        let profile = UserProfile(email: account.email, displayName: account.displayName, createdAt: account.createdAt)
        profile.saveAsCurrent()
        return true
    }
}

extension UserProfile {
    static func loadCurrent() -> UserProfile? {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode(UserProfile.self, from: data) else { return nil }
        return decoded
    }

    func saveAsCurrent() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        UserDefaults.standard.set(data, forKey: UserProfile.key)
    }
}
