using System.Collections.Generic;
using System.Threading.Tasks;
using Firebase.Functions;

namespace Game.Services
{
    public interface IEconomyService
    {
        Task UpgradePlayer(string ownedId);
        Task TakeLoan(int amount, string type);
        Task PayDebt(string debtId, int amount);
    }

    public class EconomyService : IEconomyService
    {
        private static Task Call(string name, Dictionary<string, object> data) =>
            FirebaseFunctions.DefaultInstance.GetHttpsCallable(name).CallAsync(data);

        public Task UpgradePlayer(string ownedId) =>
            Call("upgradePlayer", new() { { "ownedId", ownedId } });

        public Task TakeLoan(int amount, string type) =>
            Call("takeLoan", new() { { "amount", amount }, { "type", type } });

        public Task PayDebt(string debtId, int amount) =>
            Call("payDebt", new() { { "debtId", debtId }, { "amount", amount } });
    }
}
