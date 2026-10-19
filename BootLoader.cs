using System.Threading.Tasks;
using Firebase;
using Firebase.Auth;
using Firebase.Firestore;
using Firebase.Functions;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Game.Services
{
    public class BootLoader : MonoBehaviour
    {
        private async void Start()
        {
            ApplyQualityProfile();

            var status = await FirebaseApp.CheckAndFixDependenciesAsync();
            if (status != DependencyStatus.Available)
            {
                Debug.LogError($"Firebase xatosi: {status}");
                return;
            }

            var auth = FirebaseAuth.DefaultInstance;
            if (auth.CurrentUser == null)
                await auth.SignInAnonymouslyAsync(); // keyin Google/Apple bilan link qilinadi

            await EnsureUserProfile(auth.CurrentUser);
            SceneManager.LoadScene("MainMenu");
        }

        private static async Task EnsureUserProfile(FirebaseUser user)
        {
            var doc = FirebaseFirestore.DefaultInstance.Collection("users").Document(user.UserId);
            var snap = await doc.GetSnapshotAsync();
            if (snap.Exists) return;
            await FirebaseFunctions.DefaultInstance.GetHttpsCallable("initUser").CallAsync(null);
        }

        private static void ApplyQualityProfile()
        {
            int ram = SystemInfo.systemMemorySize;
            int level = ram >= 6000 ? 2 : ram >= 3500 ? 1 : 0; // 0=Low, 1=Mid, 2=High
            QualitySettings.SetQualityLevel(level, true);
            Application.targetFrameRate = level == 0 ? 30 : 60;
        }
    }
}
