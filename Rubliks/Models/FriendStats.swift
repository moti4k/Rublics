//
//  FriendStats.swift
//  Rubliks
//

import Foundation

/// Данные для рейтинга друзей: баланс, уроки, квиз.
struct FriendStats: Identifiable {
    let id: String
    let name: String
    let balanceRub: Double
    let videosWatched: Int
    let quizCorrectCount: Int
}

// MARK: - Текущий пользователь (счётчики уроков и квиза)
private let videosWatchedKey = "userVideosWatchedCount"
private let quizCorrectKey = "userQuizCorrectCount"

enum UserStats {
    static var videosWatched: Int {
        get { UserDefaults.standard.integer(forKey: videosWatchedKey) }
        set { UserDefaults.standard.set(newValue, forKey: videosWatchedKey) }
    }
    static var quizCorrectCount: Int {
        get { UserDefaults.standard.integer(forKey: quizCorrectKey) }
        set { UserDefaults.standard.set(newValue, forKey: quizCorrectKey) }
    }
}

// MARK: - Список друзей (локальное хранение)
private let friendsListKey = "friendsStatsList"

struct FriendStatsCodable: Codable {
    let id: String
    let name: String
    let balanceRub: Double
    let videosWatched: Int
    let quizCorrectCount: Int
}

enum FriendsStorage {
    static func load() -> [FriendStats] {
        guard let data = UserDefaults.standard.data(forKey: friendsListKey),
              let decoded = try? JSONDecoder().decode([FriendStatsCodable].self, from: data) else {
            return defaultMockFriends()
        }
        return decoded.map { FriendStats(id: $0.id, name: $0.name, balanceRub: $0.balanceRub, videosWatched: $0.videosWatched, quizCorrectCount: $0.quizCorrectCount) }
    }

    static func save(_ friends: [FriendStats]) {
        let codable = friends.map { FriendStatsCodable(id: $0.id, name: $0.name, balanceRub: $0.balanceRub, videosWatched: $0.videosWatched, quizCorrectCount: $0.quizCorrectCount) }
        guard let data = try? JSONEncoder().encode(codable) else { return }
        UserDefaults.standard.set(data, forKey: friendsListKey)
    }

    static func addFriend(_ friend: FriendStats) {
        var list = load()
        if !list.contains(where: { $0.id == friend.id }) {
            list.append(friend)
            save(list)
        }
    }

    private static func defaultMockFriends() -> [FriendStats] {
        [
            FriendStats(id: "f1", name: "Алексей", balanceRub: 85_000, videosWatched: 12, quizCorrectCount: 45),
            FriendStats(id: "f2", name: "Мария", balanceRub: 120_000, videosWatched: 8, quizCorrectCount: 32),
            FriendStats(id: "f3", name: "Дмитрий", balanceRub: 45_000, videosWatched: 18, quizCorrectCount: 58)
        ]
    }
}
