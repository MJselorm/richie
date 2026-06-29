const API = "http://127.0.0.1:8000/auth";



// SIGNUP

async function signup(){

    let email =
    document.getElementById("signupEmail").value;


    let password =
    document.getElementById("signupPassword").value;



    let res = await fetch(
        `${API}/signup`,
        {

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({
            email,
            password
        })

    });



    let data = await res.json();

    alert(JSON.stringify(data));

}




// LOGIN

async function login(){


let email =
document.getElementById("loginEmail").value;


let password =
document.getElementById("loginPassword").value;



let res = await fetch(
`${API}/login`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email,
password
})


});


let data = await res.json();



if(data.access_token){

    localStorage.setItem(
        "token",
        data.access_token
    );


    showProfile(email);

}

else{

alert("Login failed");

}



}




function showProfile(email){

document.getElementById("auth")
.style.display="none";


document.getElementById("profile")
.style.display="block";


document.getElementById("user")
.innerHTML =
"Logged in as: "+email;


}




function logout(){

localStorage.removeItem("token");

location.reload();

}